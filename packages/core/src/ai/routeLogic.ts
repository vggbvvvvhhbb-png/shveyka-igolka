import { ChatRequestSchema, type ChatMessage } from "./requestSchema";
import { MAX_TOKENS } from "./constants";

export type ChatProvider = "kimi" | "anthropic" | "openrouter";

export const PROVIDER_URLS: Record<ChatProvider, string> = {
  kimi: "https://api.moonshot.ai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
};

export type ValidatedRequest = { messages: ChatMessage[] };
export type ValidationError = { error: string; issues?: string[] };

/**
 * Zod-валидация тела запроса: не более 10 сообщений,
 * каждое ≤ 1000 символов, роли только user/assistant.
 */
export function validateChatRequest(body: unknown): ValidatedRequest | ValidationError {
  const parsed = ChatRequestSchema.safeParse(body);
  if (parsed.success) {
    return { messages: parsed.data.messages };
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
  model: string
): Record<string, unknown> {
  if (provider === "anthropic") {
    return {
      model,
      max_tokens: MAX_TOKENS,
      stream: true,
      system: systemPrompt,
      messages,
    };
  }
  return {
    model,
    stream: true,
    max_tokens: MAX_TOKENS,
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
 * Разбор одной SSE-строки ответа провайдера.
 * Возвращает текст дельты или null (служебные/пустые/битые строки).
 */
export function parseSSEChunk(line: string, provider: ChatProvider | string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (payload === "" || payload === "[DONE]") return null;

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return null;
  }

  const obj = json as Record<string, any>;
  if (provider === "anthropic") {
    if (obj?.type === "content_block_delta" && typeof obj?.delta?.text === "string") {
      return obj.delta.text;
    }
    return null;
  }
  const text = obj?.choices?.[0]?.delta?.content;
  return typeof text === "string" && text.length > 0 ? text : null;
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

/**
 * Список разрешённых slug контекста в формате "тип/slug" для заголовка
 * X-Context-Slugs. Строка обрезается до maxLength символов.
 */
export function buildAllowedSlugsHeader(
  context: {
    fabrics: { slug: string }[];
    seams: { slug: string }[];
    projects: { slug: string }[];
  },
  maxLength = 2000
): string {
  const slugs = [
    ...context.fabrics.map((f) => `fabrics/${f.slug}`),
    ...context.seams.map((s) => `seams/${s.slug}`),
    ...context.projects.map((p) => `projects/${p.slug}`),
  ];
  let result = "";
  for (const slug of slugs) {
    const next = result ? `${result},${slug}` : slug;
    if (next.length > maxLength) break;
    result = next;
  }
  return result;
}
