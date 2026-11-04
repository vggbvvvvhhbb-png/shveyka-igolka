import { ChatRequestSchema, type ChatMessage } from "./requestSchema";
import { MAX_TOKENS } from "./constants";
import { parseProviderUsage, type TokenUsage } from "./usage";
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
    // Провайдер присылает счётчик токенов в конце потока: без этой просьбы
    // он молчит, и расход пришлось бы угадывать.
    stream_options: { include_usage: true },
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
  /** Счётчик токенов; null — если провайдер его не сообщил. */
  usage: TokenUsage | null;
}

export function parseSSEPiece(line: string, provider: ChatProvider | string): SSEPiece {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return { text: null, finishReason: null, usage: null };

  const payload = trimmed.slice(5).trim();
  if (payload === "" || payload === "[DONE]")
    return { text: null, finishReason: null, usage: null };

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return { text: null, finishReason: null, usage: null };
  }

  const obj = json as {
    type?: unknown;
    delta?: { text?: unknown; stop_reason?: unknown };
    choices?: Array<{ delta?: { content?: unknown }; finish_reason?: unknown }>;
    usage?: unknown;
    message?: { usage?: unknown };
  };

  if (provider === "anthropic") {
    // Anthropic шлёт входные токены в начале сообщения, выходные — в конце.
    if (obj?.type === "content_block_delta" && typeof obj?.delta?.text === "string") {
      return { text: obj.delta.text, finishReason: null, usage: null };
    }
    if (obj?.type === "message_delta" && typeof obj?.delta?.stop_reason === "string") {
      return {
        text: null,
        finishReason: obj.delta.stop_reason,
        usage: parseProviderUsage(obj.usage),
      };
    }
    if (obj?.type === "message_start") {
      return { text: null, finishReason: null, usage: parseProviderUsage(obj.message?.usage) };
    }
    return { text: null, finishReason: null, usage: null };
  }

  const choice = obj?.choices?.[0];
  const text = choice?.delta?.content;
  const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : null;
  return {
    text: typeof text === "string" && text.length > 0 ? text : null,
    finishReason,
    usage: parseProviderUsage(obj?.usage),
  };
}

/**
 * Разбор одной SSE-строки ответа провайдера.
 * Возвращает текст дельты или null (служебные/пустые/битые строки).
 */
export function parseSSEChunk(line: string, provider: ChatProvider | string): string | null {
  return parseSSEPiece(line, provider).text;
}
