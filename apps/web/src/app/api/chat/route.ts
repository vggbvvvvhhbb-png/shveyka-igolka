import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildAllowedSlugsHeader,
  buildRequestBody,
  checkRateLimit,
  isValidatedRequest,
  parseSSEChunk,
  PROVIDER_URLS,
  validateChatRequest,
  type ChatMessage,
  type ChatProvider,
  type RateStore,
} from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";

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
  const providerEnv = process.env.AI_PROVIDER;
  return providerEnv === "anthropic" || providerEnv === "openrouter" ? providerEnv : "kimi";
}

function getModel(provider: ChatProvider): string | null {
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL ?? null;
  if (provider === "openrouter") return process.env.OPENROUTER_MODEL ?? null;
  return "moonshot-v1-8k";
}

function getApiKey(provider: ChatProvider): string | undefined {
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY;
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY;
  return process.env.KIMI_API_KEY;
}

async function streamFromProvider(
  provider: ChatProvider,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
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
      : {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Shveyka",
        };

  return fetch(PROVIDER_URLS[provider], {
    method: "POST",
    headers,
    body: JSON.stringify(buildRequestBody(messages, systemPrompt, provider, model)),
  });
}

/**
 * Превращает SSE-поток провайдера в текстовый стрим для клиента.
 * Разбор строк — в parseSSEChunk (@shveyka/core), оттестирован без сети.
 */
function toTextStream(
  upstream: ReadableStream<Uint8Array>,
  provider: ChatProvider
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

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
            const text = parseSSEChunk(line, provider);
            if (text !== null) {
              controller.enqueue(encoder.encode(text));
            }
          }
        }
        controller.close();
      } catch {
        controller.error(new Error(GENERIC_ERROR));
      }
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  if (!checkRateLimit(getClientIp(req), rateStore)) {
    return NextResponse.json(
      { error: "Слишком много запросов, подождите минуту" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const validated = validateChatRequest(body);
  if (!isValidatedRequest(validated)) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { messages } = validated;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "Нет сообщения пользователя" }, { status: 400 });
  }

  const provider = resolveProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    console.error("[chat] AI provider API key is not configured");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  try {
    const db = getDbSingleton();
    const context = await queries.searchContext(db, lastUser.content);
    const systemPrompt = buildSystemPrompt(context);

    const upstream = await streamFromProvider(provider, apiKey, systemPrompt, messages);

    if (!upstream.ok || !upstream.body) {
      console.error(`[chat] provider responded with status ${upstream.status}`);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
    }

    // Список slug из контекста — UI сделает кликабельными только ссылки на них.
    const allowedSlugs = buildAllowedSlugsHeader(context);

    return new Response(toTextStream(upstream.body, provider), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Context-Slugs": allowedSlugs,
      },
    });
  } catch (err) {
    console.error("[chat] request failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
