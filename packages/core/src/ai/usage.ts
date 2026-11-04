/**
 * Расход токенов.
 *
 * Токены — это единица работы языковой модели: сколько текста ушло на вопрос
 * (вместе с системным промтом и справочником) и сколько модель написала в
 * ответе. По этим числам видно, кто и чем именно пользовался помощником и
 * сколько это стоило.
 *
 * Счётчик присылает провайдер. Если он его не прислал (бывает у некоторых
 * шлюзов), расход считается приблизительно — по длине текста, и такая запись
 * помечается флагом `estimated`, чтобы в отчёте не выдавать оценку за точные
 * данные.
 */

/** Сколько токенов ушло на запрос и на ответ. */
export interface TokenUsage {
  /** Токены вопроса вместе с системным промтом и контекстом. */
  promptTokens: number;
  /** Токены ответа модели. */
  completionTokens: number;
  /** Всего токенов. */
  totalTokens: number;
}

/** Расход, когда модель не отвечала: запрос не дошёл до неё. */
export function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

/** Складывает два расхода: так считается общий расход режима из нескольких запросов. */
export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/**
 * Сливает два счётчика, беря максимум по каждому полю.
 *
 * Нужно для потоковых ответов: у OpenAI-совместимых провайдеров счётчик
 * приходит один раз в конце потока и описывает весь запрос, а у Anthropic
 * в начале и в конце — входные и выходные токены по отдельности. Сложение
 * здесь дало бы двойной счёт, поэтому берётся максимум.
 */
export function mergeUsage(a: TokenUsage | null, b: TokenUsage | null): TokenUsage | null {
  if (!a) return b;
  if (!b) return a;
  return {
    promptTokens: Math.max(a.promptTokens, b.promptTokens),
    completionTokens: Math.max(a.completionTokens, b.completionTokens),
    totalTokens: Math.max(a.totalTokens, b.totalTokens),
  };
}

/** Приводит значение к неотрицательному целому: провайдеры шлют и строки, и числа. */
function toCount(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

/**
 * Разбирает счётчик токенов из ответа провайдера.
 *
 * Поддерживаются оба формата: OpenAI-совместимый (`prompt_tokens`,
 * `completion_tokens`, `total_tokens`) и Anthropic (`input_tokens`,
 * `output_tokens`). Если чисел нет — возвращается null: это значит, что
 * провайдер счётчик не прислал.
 */
export function parseProviderUsage(raw: unknown): TokenUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const promptTokens = toCount(obj.prompt_tokens ?? obj.input_tokens);
  const completionTokens = toCount(obj.completion_tokens ?? obj.output_tokens);
  const totalTokens = toCount(obj.total_tokens) || promptTokens + completionTokens;

  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) return null;
  return { promptTokens, completionTokens, totalTokens };
}

/**
 * Приблизительный расход по длине текста.
 *
 * Один токен — примерно два-три знака русского текста. Точная цифра не
 * важна: нужно понять масштаб, когда провайдер счётчик не прислал.
 */
export function estimateUsage(promptText: string, answerText: string): TokenUsage {
  const promptTokens = Math.ceil(promptText.length / 2.5);
  const completionTokens = Math.ceil(answerText.length / 2.5);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

/** Функция помощника, которой воспользовался человек. */
export type UsageFeature = "catalog" | "search" | "reason" | "research";

/** Человеческое название функции помощника: в отчёте это читается без догадок. */
export const USAGE_FEATURE_LABELS: Record<UsageFeature, string> = {
  catalog: "Каталог",
  search: "Поиск",
  reason: "Рассуждение",
  research: "Ресёрч",
};

/** Откуда пришёл запрос: сайт или Telegram-бот. */
export type UsageSource = "web" | "bot";

/** Человеческое название источника запроса. */
export const USAGE_SOURCE_LABELS: Record<UsageSource, string> = {
  web: "Сайт",
  bot: "Telegram-бот",
};
