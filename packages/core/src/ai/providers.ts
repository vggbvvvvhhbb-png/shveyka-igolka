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

/** Переменные с ключами провайдеров: по ней видно, что настроено. */
export const PROVIDER_KEY_ENV: Record<ChatProvider, string> = {
  kimi: "KIMI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  relay: "RELAY_API_KEY",
};

/** Как провайдер называется для человека. */
export const PROVIDER_LABELS: Record<ChatProvider, string> = {
  kimi: "Kimi (Moonshot)",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  relay: "relay.fast",
};

/**
 * Ключ провайдера.
 *
 * Значение ключа не возвращается: наружу идёт только имя переменной,
 * чтобы по нему было видно, что именно не задано.
 */
export function providerKeyEnv(provider: ChatProvider): string {
  return PROVIDER_KEY_ENV[provider];
}

/** Задан ли ключ провайдера. */
export function providerReady(
  provider: ChatProvider,
  env: Record<string, string | undefined> = process.env
): boolean {
  const value = env[PROVIDER_KEY_ENV[provider]];
  return typeof value === "string" && value.trim().length > 0;
}

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
