import { NextResponse } from "next/server";
import { ChatRequestSchema, buildSystemPrompt } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось получить ответ, попробуйте позже";

// Простой лимит в памяти: 20 запросов за 60 секунд с одного IP.
// Работает только в одном процессе; на нескольких инстансах лимит слабее.
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const rateStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateStore.get(ip);
  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    rateStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

async function streamFromKimi(
  apiKey: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  return fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "moonshot-v1-8k",
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
}

type ChatProvider = "kimi" | "anthropic" | "openrouter";

async function streamFromOpenRouter(
  apiKey: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  const model = process.env.OPENROUTER_MODEL;
  if (!model) {
    throw new Error("OPENROUTER_MODEL is not set");
  }
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Shveyka",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
}

async function streamFromAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    throw new Error("ANTHROPIC_MODEL is not set");
  }
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  });
}

/**
 * Превращает SSE-поток провайдера в текстовый стрим для клиента.
 * Kimi: choices[0].delta.content. Anthropic: delta.text у content_block_delta.
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
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]" || payload === "") continue;

            try {
              const json = JSON.parse(payload);
              const text =
                provider === "anthropic"
                  ? json?.type === "content_block_delta"
                    ? json?.delta?.text
                    : undefined
                  : json?.choices?.[0]?.delta?.content;
              if (typeof text === "string" && text.length > 0) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Неполный или нестандартный фрагмент пропускаем.
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
  if (!checkRateLimit(getClientIp(req))) {
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

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректный запрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { messages } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "Нет сообщения пользователя" }, { status: 400 });
  }

  const providerEnv = process.env.AI_PROVIDER;
  const provider: ChatProvider =
    providerEnv === "anthropic" || providerEnv === "openrouter" ? providerEnv : "kimi";
  const apiKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "openrouter"
        ? process.env.OPENROUTER_API_KEY
        : process.env.KIMI_API_KEY;

  if (!apiKey) {
    console.error("[chat] AI provider API key is not configured");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  try {
    const db = getDbSingleton();
    const context = await queries.searchContext(db, lastUser.content);
    const systemPrompt = buildSystemPrompt(context);

    const upstream =
      provider === "kimi"
        ? await streamFromKimi(apiKey, systemPrompt, messages)
        : provider === "openrouter"
          ? await streamFromOpenRouter(apiKey, systemPrompt, messages)
          : await streamFromAnthropic(apiKey, systemPrompt, messages);

    if (!upstream.ok || !upstream.body) {
      console.error(`[chat] provider responded with status ${upstream.status}`);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
    }

    return new Response(toTextStream(upstream.body, provider), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[chat] request failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
