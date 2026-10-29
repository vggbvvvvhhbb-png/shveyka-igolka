import {
  buildContextSlugsHeader,
  buildRequestBody,
  buildSystemPrompt,
  cacheKey,
  collectContextSlugs,
  collectRelatedLinks,
  createRequestId,
  groupContext,
  hasMeasurements,
  isCacheable,
  isValidatedRequest,
  looksTruncated,
  parseAnswer,
  parseSSEPiece,
  prepareChat,
  resolveProviderName,
  resolveProviderUrl,
  textToStream,
  TtlLruCache,
  validateChatRequest,
  DEFAULT_RELAY_MODEL,
  CONTINUE_NOTE,
  type ChatMessage,
  type ChatProvider,
} from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { clientIp, limitRequest } from "@/lib/guard";
import { requestIsOwner } from "@/lib/owner";
import { loadCatalog, poolOf } from "@/lib/catalog";
import { saveAssistantTurn, saveUserTurn } from "@/lib/chatHistory";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось получить ответ, попробуйте позже";

/**
 * Кэш ответов: 500 записей, сутки жизни.
 *
 * Живёт в globalThis — на сервере Next.js модуль пересоздаётся при горячей
 * перезагрузке, а кэш должен переживать её.
 */
const g = globalThis as unknown as { __shveykaAnswers?: TtlLruCache<string> };
const answers = (g.__shveykaAnswers ??= new TtlLruCache<string>());

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
 * дописать (например, пометку об обрыве ответа). Он же сохраняет ответ
 * в истории — до закрытия потока, чтобы к моменту, когда клиент увидел
 * конец ответа, сообщение уже лежало в базе и его можно было оценить.
 */
function toTextStream(
  upstream: ReadableStream<Uint8Array>,
  provider: ChatProvider,
  onDone: (full: string, finishReason: string | null) => Promise<string>
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

        const tail = await onDone(full, finishReason);
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

  const limited = await limitRequest(req, { key: `chat:${clientIp(req)}`, requestId });
  if (limited) return limited;

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

    // Мерки — личные данные владельца. Чужому посетителю они не достаются,
    // поэтому в ответ подставляются только по ключу владельца.
    const owner = requestIsOwner(req);

    // Контекст страницы, поиск по вопросу, режим ответа и мягкий отказ
    // собираются в одной функции — маршрут остаётся тонкой обвязкой.
    const prep = await prepareChat(
      {
        search: (question) => queries.searchContext(db, question, { withMeasurements: owner }),
        entry: (ref) =>
          queries.findContextEntry(db, ref.kind, ref.slug, { withMeasurements: owner }),
        pool: poolOf(catalog),
      },
      { question: lastUser.content, ctx: validated.ctx, mode: validated.mode }
    );

    // Мерки владельца возвращаются в блок данных: без них промт остался бы
    // без размеров пользователя, а ответ считался бы общим.
    const context = groupContext(prep.context, prep.measurements);
    // Режим ответа меняет форму ответа: короткий остаётся коротким,
    // остальные получают разделы и вопросы для кнопок.
    const systemPrompt = `${buildSystemPrompt(context, prep.mode)}\n\n${prep.rules}`;

    // Список slug из контекста — UI сделает кликабельными только ссылки на них.
    const allowedSlugs = buildContextSlugsHeader(prep.context);
    // Тот же список сохраняется вместе с ответом: в открытом заново диалоге
    // ссылки на каталог снова кликабельны.
    const contextSlugs = collectContextSlugs(prep.context);
    // Записи каталога из контекста: интерфейс показывает их карточками под
    // ответом, чтобы можно было сразу перейти к нужной записи.
    const related = collectRelatedLinks(prep.context);

    const headers = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Context-Slugs": allowedSlugs,
      // Названия записей русские, а заголовок — байтовая строка: без
      // кодирования в него они не помещаются.
      "X-Context-Related": encodeURIComponent(JSON.stringify(related)),
      "X-Request-Id": requestId,
    };

    // Кэшируем только ответы, которые зависят от каталога, а не от человека:
    // без истории диалога и без мерок. Мерки попадают в ответ только владельцу.
    const usesMeasurements = hasMeasurements(prep.measurements);
    const cacheable = isCacheable({ hasHistory: messages.length > 1, usesMeasurements });

    const key = cacheKey({
      question: lastUser.content,
      slugs: prep.context.map((e) => e.slug),
      mode: prep.mode,
      catalogVersion: catalog.version,
    });

    if (cacheable) {
      const hit = answers.get(key);
      if (hit) {
        console.info("[chat] ответ взят из кэша", { requestId });
        return new Response(textToStream(hit), { headers });
      }
    }

    // История: вопрос сохраняется сразу, ответ — когда стрим дочитан.
    const conversationId = await saveUserTurn(
      db,
      requestId,
      req.headers.get("x-conversation-id"),
      lastUser.content
    );
    const assistantMessageId = crypto.randomUUID();

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

    return new Response(
      toTextStream(upstream.body, provider, async (full, finishReason) => {
        const truncated = looksTruncated(full, finishReason);

        // Оборванный ответ не сохраняем в кэш: следующий посетитель получил бы
        // обрывок вместо целого ответа.
        //
        // В кэш идёт исходный текст вместе с блоком вопросов: клиент сам
        // разбирает его на кнопки, и обрезанный ответ сохранил бы кнопки,
        // которые не к чему привязать.
        if (cacheable && !truncated && full) answers.set(key, full);

        // Блок вопросов убирается из текста и сохраняется отдельно: в
        // открытом заново диалоге вопросы остаются кнопками под ответом.
        const parsed = parseAnswer(full);

        // Ответ уходит в историю до закрытия потока: когда клиент увидел конец
        // ответа, сообщение уже лежит в базе и его можно оценить.
        if (conversationId) {
          await saveAssistantTurn(
            db,
            requestId,
            conversationId,
            assistantMessageId,
            parsed.text,
            contextSlugs,
            { followUps: parsed.followUps, related }
          );
        }

        return truncated ? CONTINUE_NOTE : "";
      }),
      {
        headers: {
          ...headers,
          ...(conversationId
            ? { "X-Conversation-Id": conversationId, "X-Message-Id": assistantMessageId }
            : {}),
        },
      }
    );
  } catch (err) {
    logFailure("chat", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
