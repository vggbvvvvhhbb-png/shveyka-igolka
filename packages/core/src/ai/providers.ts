/**
 * Провайдеры AI, с которыми умеет работать /api/chat.
 *
 * kimi, openrouter и relay — OpenAI-совместимый формат запроса и ответа,
 * anthropic — собственный формат.
 */
export type ChatProvider = "kimi" | "anthropic" | "openrouter" | "relay";

/** Базовый адрес relay.fast по умолчанию. Меняется переменной RELAY_BASE_URL. */
export const DEFAULT_RELAY_BASE_URL = "https://relay.fast";

/** Модель relay.fast по умолчанию. Меняется переменной RELAY_MODEL. */
export const DEFAULT_RELAY_MODEL = "gpt-5.6-terra";

/** Адреса чат-комплишена провайдеров. */
export const PROVIDER_URLS: Record<ChatProvider, string> = {
  kimi: "https://api.moonshot.ai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  relay: "https://relay.fast/v1/chat/completions",
};

/**
 * Приводит значение AI_PROVIDER к известному провайдеру.
 * Неизвестное значение трактуется как kimi — как и раньше.
 */
export function resolveProviderName(value: string | undefined): ChatProvider {
  if (value === "anthropic" || value === "openrouter" || value === "relay") {
    return value;
  }
  return "kimi";
}

/** Убирает хвостовые слэши, чтобы базовый адрес можно было задавать свободно. */
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Адрес чат-комплишена провайдера.
 *
 * У relay базовый адрес задаётся извне (RELAY_BASE_URL), поэтому адрес
 * собирается из него; остальные провайдеры работают по фиксированным URL.
 */
export function resolveProviderUrl(provider: ChatProvider, relayBaseUrl?: string): string {
  if (provider !== "relay") {
    return PROVIDER_URLS[provider];
  }
  const base = trimTrailingSlash(relayBaseUrl?.trim() || DEFAULT_RELAY_BASE_URL);
  return `${base}/v1/chat/completions`;
}
