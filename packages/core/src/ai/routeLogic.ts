import { ChatRequestSchema, type ChatMessage } from "./requestSchema";
import { MAX_TOKENS } from "./constants";
import type { ChatProvider } from "./providers";

export type ValidatedRequest = {
  messages: ChatMessage[];
  /** Страница каталога: `fabric/<slug>`. Значения проверяются при разборе. */
  ctx?: string;
  /** Режим ответа: `short`, `steps` или `why`. */
  mode?: string;
};
export type ValidationError = { error: string; issues?: string[] };

/**
 * Zod-валидация тела запроса: не более 10 сообщений,
 * каждое ≤ 1000 символов, роли только user/assistant.
 */
export function validateChatRequest(body: unknown): ValidatedRequest | ValidationError {
  const parsed = ChatRequestSchema.safeParse(body);
  if (parsed.success) {
    return {
      messages: parsed.data.messages,
      ...(parsed.data.ctx ? { ctx: parsed.data.ctx } : {}),
      ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
    };
  }
  const message = parsed.error.issues[0]?.message ?? "Некорректный запрос";
  return { error: message, issues: parsed.error.issues.map((i) => i.message) };
}

export function isValidatedRequest(r: ValidatedRequest | ValidationError): r is ValidatedRequest {
  return "messages" in r;
}

/**
 * Сборка тела запроса к провайдеру. OpenRouter/Kimi — OpenAI-совместимый формат,
 * Anthropic — свой. max_tokens ограничивает расходы на ответ модели.
 */
export function buildRequestBody(
  messages: ChatMessage[],
  systemPrompt: string,
  provider: ChatProvider,
  model: string,
  maxTokens: number = MAX_TOKENS
): Record<string, unknown> {
  if (provider === "anthropic") {
    return {
      model,
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages,
    };
  }
  return {
    model,
    stream: true,
    max_tokens: maxTokens,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };
}

/**
 * Заголовки для запроса к провайдеру. Значения ключей не возвращаются —
 * вызывающий подставляет их сам.
 */
export function buildRequestHeaders(provider: ChatProvider): Record<string, string> {
  if (provider === "anthropic") {
    return { "content-type": "application/json" };
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Title": "Shveyka",
  };
  return headers;
}

/**
 * Одна SSE-строка ответа провайдера: текст дельты и причина завершения.
 *
 * Причина завершения нужна, чтобы отличить «модель закончила» от
 * «лимит токенов исчерпан» — во втором случае ответ дополняется просьбой
 * написать «продолжи».
 */
export interface SSEPiece {
  /** Текст дельты; null — если в строке текста нет. */
  text: string | null;
  /** Причина завершения; null — если провайдер её не сообщил. */
  finishReason: string | null;
}

export function parseSSEPiece(line: string, provider: ChatProvider | string): SSEPiece {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return { text: null, finishReason: null };

  const payload = trimmed.slice(5).trim();
  if (payload === "" || payload === "[DONE]") return { text: null, finishReason: null };

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return { text: null, finishReason: null };
  }

  const obj = json as {
    type?: unknown;
    delta?: { text?: unknown; stop_reason?: unknown };
    choices?: Array<{ delta?: { content?: unknown }; finish_reason?: unknown }>;
  };

  if (provider === "anthropic") {
    if (obj?.type === "content_block_delta" && typeof obj?.delta?.text === "string") {
      return { text: obj.delta.text, finishReason: null };
    }
    if (obj?.type === "message_delta" && typeof obj?.delta?.stop_reason === "string") {
      return { text: null, finishReason: obj.delta.stop_reason };
    }
    return { text: null, finishReason: null };
  }

  const choice = obj?.choices?.[0];
  const text = choice?.delta?.content;
  const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : null;
  return {
    text: typeof text === "string" && text.length > 0 ? text : null,
    finishReason,
  };
}

/**
 * Разбор одной SSE-строки ответа провайдера.
 * Возвращает текст дельты или null (служебные/пустые/битые строки).
 */
export function parseSSEChunk(line: string, provider: ChatProvider | string): string | null {
  return parseSSEPiece(line, provider).text;
}

export type RateEntry = { count: number; windowStart: number };
export type RateStore = Map<string, RateEntry>;
export const RATE_WINDOW_MS = 60_000;
export const RATE_LIMIT = 20;

/**
 * 20 запросов с одного IP за 60 секунд. Хранилище (Map) передаётся снаружи,
 * чтобы функция была тестируемой и не использовала глобальный стейт.
 */
export function checkRateLimit(ip: string, store: RateStore, now: number = Date.now()): boolean {
  const entry = store.get(ip);
  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count += 1;
  return true;
}
