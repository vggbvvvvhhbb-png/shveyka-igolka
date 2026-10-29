/**
 * Клиент LLM через APInex.
 *
 * Провайдер один, но моделей несколько: если модель не ответила или ответила
 * пустотой, берётся следующая из цепочки. Это спасает и от перегрузки
 * бесплатного тарифа, и от неверно указанного идентификатора модели.
 */

/** Роль сообщения в диалоге с моделью. */
export type ChatRole = "system" | "user" | "assistant";

/** Одно сообщение диалога с моделью. */
export type ChatTurn = {
  role: ChatRole;
  content: string;
};

/** Цепочка моделей: пробуются по порядку, пока одна не ответит. */
export type ModelChain = readonly string[];

/** Назначение цепочки: быстрый ответ, рассуждение или планирование. */
export type ModelKind = "fast" | "reason" | "navigator";

/** Ошибка LLM: сеть, лимит или пустой ответ у всех моделей цепочки. */
export class LlmError extends Error {
  readonly model: string | undefined;
  /** HTTP-статус провайдера, если ошибка пришла от него. */
  readonly status: number | undefined;

  constructor(message: string, model?: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.model = model;
    this.status = status;
  }
}

const DEFAULT_BASE_URL = "https://api.apinex.bond/v1";
const DEFAULT_TIMEOUT_MS = 45_000;

/**
 * Бесплатный тариф APInex отдаёт не больше 5 запросов в минуту, поэтому на
 * 429 запрос повторяется с паузой, а не падает сразу.
 */
const RATE_LIMIT_RETRIES = 2;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 4000;

/** Пауза перед повтором: первая — базовая, вторая — вдвое длиннее. */
function rateLimitDelayMs(attempt: number): number {
  const raw = Number(process.env.LLM_RATE_LIMIT_BACKOFF_MS);
  const base = Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_RATE_LIMIT_BACKOFF_MS;
  return base * Math.pow(2, attempt);
}

/** Пауза в миллисекундах. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Разбирает цепочку моделей из переменной окружения.
 *
 * Формат — список через запятую: `free/gpt-6-luna,free/minimax-m3.1-flash`.
 */
export function parseModelChain(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Цепочка моделей для задачи.
 *
 * Читается из окружения при каждом вызове: переменные меняются при перезапуске
 * процесса, а в тестах подменяются на лету.
 */
export function modelChain(
  kind: ModelKind,
  env: Record<string, string | undefined> = process.env
): string[] {
  const key =
    kind === "fast" ? "MODELS_FAST" : kind === "reason" ? "MODELS_REASON" : "MODELS_NAVIGATOR";
  return parseModelChain(env[key]);
}

/**
 * Убирает служебные размышления модели из текста.
 *
 * Часть моделей отдаёт размышления отдельным блоком `<think>…</think>`.
 * Пользователю они не нужны, а в отчёт попасть не должны.
 */
export function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .trim();
}

/** Параметры одного вызова модели. */
export type ChatOptions = {
  /** Цепочка моделей: пробуются по порядку. */
  models: ModelChain;
  /** История диалога с моделью. */
  messages: ChatTurn[];
  /** Температура ответа. */
  temperature?: number;
  /** Предел длины ответа в токенах. */
  maxTokens?: number;
  /** Таймаут одного запроса в миллисекундах. */
  timeoutMs?: number;
  /** Имя провайдера для логов. */
  provider?: string;
};

/** Ответ модели вместе с именем модели, которая его дала. */
export type ChatResult = {
  text: string;
  model: string;
};

type ApiMessage = { role: ChatRole; content: string };
type ApiResponse = {
  choices?: { message?: { content?: string | { text?: string }[] }; finish_reason?: string }[];
  error?: { message?: string };
};

/**
 * Достаёт текст из ответа провайдера.
 *
 * Часть провайдеров отдаёт `content` строкой, часть — массивом частей.
 */
function extractContent(raw: ApiResponse): string {
  const content = raw.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === "string" ? part : (part?.text ?? ""))).join("");
  }
  return "";
}

/**
 * Тело запроса к провайдеру.
 *
 * Тип задан явно, а не через `RequestInit`: тот живёт в библиотеке DOM и не
 * виден линтеру как глобальная переменная.
 */
type ProviderRequest = {
  method: "POST";
  headers: Record<string, string>;
  body: string;
};

async function fetchWithTimeout(
  url: string,
  init: ProviderRequest,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Один запрос к модели.
 *
 * Бросает LlmError, если провайдер ответил ошибкой или пустым текстом.
 * На 429 делает паузу и повторяет запрос: бесплатный тариф отдаёт 429 при
 * частых обращениях, и это не поломка, а ограничение.
 */
async function askModel(
  model: string,
  options: ChatOptions,
  apiKey: string,
  baseUrl: string
): Promise<string> {
  const messages: ApiMessage[] = options.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const body = JSON.stringify({
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 1200,
    stream: false,
  });

  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const response = await fetchWithTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      },
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );

    if (response.status === 429 && attempt < RATE_LIMIT_RETRIES) {
      const delay = rateLimitDelayMs(attempt);
      console.warn("[llm] провайдер ограничил частоту запросов, ждём и повторяем", {
        model,
        attempt: attempt + 1,
        delay,
      });
      await sleep(delay);
      continue;
    }

    if (!response.ok) {
      // Тело ответа помогает понять причину (402 — нет кредитов, 404 — нет
      // такой модели), но наружу оно не выходит: клиент получает обобщённый текст.
      const detail = await response.text().catch(() => "");
      console.error("[llm] provider responded with an error", {
        model,
        status: response.status,
        detail: detail.slice(0, 300),
      });
      throw new LlmError(
        `Модель ${model} ответила ошибкой ${response.status}`,
        model,
        response.status
      );
    }

    const payload = (await response.json()) as ApiResponse;
    const text = stripThinking(extractContent(payload));
    if (!text) {
      throw new LlmError(`Модель ${model} вернула пустой ответ`, model);
    }
    return text;
  }

  throw new LlmError(`Модель ${model} не ответила из-за лимита запросов`, model, 429);
}

/**
 * Спрашивает модель, перебирая цепочку.
 *
 * Возвращает текст и имя модели, которая ответила. Если не ответил никто —
 * бросает LlmError.
 */
export async function chat(options: ChatOptions): Promise<ChatResult> {
  const apiKey = process.env.APINEX_API_KEY;
  if (!apiKey) {
    throw new LlmError("Ключ LLM-провайдера не настроен");
  }
  if (options.models.length === 0) {
    throw new LlmError("Цепочка моделей не настроена");
  }

  const baseUrl = (process.env.APINEX_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  let lastError: LlmError | null = null;

  for (const model of options.models) {
    try {
      const text = await askModel(model, options, apiKey, baseUrl);
      return { text, model };
    } catch (err) {
      lastError = err instanceof LlmError ? err : new LlmError("Модель не ответила", model);
      console.warn("[llm] модель не подошла, пробуем следующую", {
        model,
        name: lastError.name,
        status: lastError.status,
      });
      // Лимит запросов общий для аккаунта: следующая модель его не обойдёт,
      // поэтому дальше не идём и отдаём понятную ошибку.
      if (lastError.status === 429) throw lastError;
    }
  }

  throw lastError ?? new LlmError("Ни одна модель не ответила");
}
