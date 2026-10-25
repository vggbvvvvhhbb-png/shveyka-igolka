import {
  buildContextSlugsHeader,
  buildRequestBody,
  buildSystemPrompt,
  checkRateLimit,
  createRequestId,
  flattenContext,
  groupContext,
  isValidatedRequest,
  looksTruncated,
  parseSSEPiece,
  prepareChat,
  resolveProviderName,
  resolveProviderUrl,
  validateChatRequest,
  DEFAULT_RELAY_MODEL,
  CONTINUE_NOTE,
  type ChatMessage,
  type ChatProvider,
  type RateStore,
} from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { loadCatalog, poolOf } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось получить ответ, попробуйте позже";

// Лимит хранится в памяти процесса: 20 запросов за 60 секунд с одного IP.
// На нескольких инстансах лимит слабее — для production нужен внешний rate limit.
const rateStore: RateStore = new Map();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function resolveProvider(): ChatProvider {
  return resolveProviderName(process.env.AI_PROVIDER);
}

function getModel(provider: ChatProvider): string | null {
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL ?? null;
  if (provider === "openrouter") return process.env.OPENROUTER_MODEL ?? null;
  if (provider === "relay") return process.env.RELAY_MODEL ?? DEFAULT_RELAY_MODEL;
  return "moonshot-v1-8k";
}

function getApiKey(provider: ChatProvider): string | undefined {
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY;
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY;
  if (provider === "relay") return process.env.RELAY_API_KEY;
  return process.env.KIMI_API_KEY;
}

async function streamFromProvider(
  provider: ChatProvider,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<Response> {
  const model = getModel(provider);
  if (!model) {
    throw new Error(`${provider} model is not configured`);
  }
  const headers: Record<string, string> =
    provider === "anthropic"
      ? {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        }
      : provider === "openrouter"
        ? {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "Shveyka",
          }
        : {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };

  return fetch(resolveProviderUrl(provider, process.env.RELAY_BASE_URL), {
    method: "POST",
    headers,
    body: JSON.stringify(buildRequestBody(messages, systemPrompt, provider, model, maxTokens)),
  });
}

/**
 * Превращает SSE-поток провайдера в текстовый поток для клиента.
 *
 * Разбор строк — в parseSSEPiece (@shveyka/core), оттестирован без сети.
 * `onDone` вызывается в конце потока и возвращает текст, который нужно
 * дописать (например, пометку об обрыве ответа).
 */
function toTextStream(
  upstream: ReadableStream<Uint8Array>,
  provider: ChatProvider,
  onDone: (full: string, finishReason: string | null) => string
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let full = "";
  let finishReason: string | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            const piece = parseSSEPiece(line, provider);
            if (piece.finishReason) finishReason = piece.finishReason;
            if (piece.text !== null) {
              full += piece.text;
              controller.enqueue(encoder.encode(piece.text));
            }
          }
        }

        const tail = onDone(full, finishReason);
        if (tail) controller.enqueue(encoder.encode(tail));
        controller.close();
      } catch {
        controller.error(new Error(GENERIC_ERROR));
      }
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  // Идентификатор запроса попадает и в лог, и в ответ с ошибкой: по нему
  // можно найти конкретное обращение, не выдавая клиенту внутренних деталей.
  const requestId = createRequestId();

  if (!checkRateLimit(getClientIp(req), rateStore)) {
    return errorResponse("Слишком много запросов, подождите минуту", 429, requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Некорректный запрос", 400, requestId);
  }

  const validated = validateChatRequest(body);
  if (!isValidatedRequest(validated)) {
    return errorResponse(validated.error, 400, requestId);
  }

  const { messages } = validated;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return errorResponse("Нет сообщения пользователя", 400, requestId);
  }

  const provider = resolveProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    console.error("[chat] AI provider API key is not configured", { requestId });
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }

  try {
    const db = getDbSingleton();
    const catalog = await loadCatalog();

    // Контекст страницы, поиск по вопросу, режим ответа и мягкий отказ
    // собираются в одной функции — маршрут остаётся тонкой обвязкой.
    const prep = await prepareChat(
      {
        search: async (question) => flattenContext(await queries.searchContext(db, question)),
        entry: (ref) => queries.findContextEntry(db, ref.kind, ref.slug),
        pool: poolOf(catalog),
      },
      { question: lastUser.content, ctx: validated.ctx, mode: validated.mode }
    );

    const context = groupContext(prep.context);
    const systemPrompt = `${buildSystemPrompt(context)}\n\n${prep.rules}`;

    const upstream = await streamFromProvider(
      provider,
      apiKey,
      systemPrompt,
      messages,
      prep.maxTokens
    );

    if (!upstream.ok || !upstream.body) {
      // Тело ответа провайдера помогает понять причину (402 — нет кредитов,
      // 404 — неверная модель), но клиенту эти детали не показываются.
      const detail = await upstream.text().catch(() => "");
      console.error(`[chat] provider responded with status ${upstream.status}`, {
        requestId,
        detail: detail.slice(0, 500),
      });
      return errorResponse(GENERIC_ERROR, 502, requestId);
    }

    // Список slug из контекста — UI сделает кликабельными только ссылки на них.
    const allowedSlugs = buildContextSlugsHeader(prep.context);

    return new Response(
      toTextStream(upstream.body, provider, (full, finishReason) =>
        looksTruncated(full, finishReason) ? CONTINUE_NOTE : ""
      ),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Context-Slugs": allowedSlugs,
          "X-Request-Id": requestId,
        },
      }
    );
  } catch (err) {
    logFailure("chat", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
