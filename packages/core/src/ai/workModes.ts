/**
 * Режимы работы помощника.
 *
 * Отдельно от режима ответа (коротко / по шагам / почему): режим работы
 * выбирает, откуда берётся информация и какая модель её обрабатывает.
 */

/** Режимы работы помощника. */
export const WORK_MODES = ["chat", "search", "reason", "research"] as const;

export type WorkMode = (typeof WORK_MODES)[number];

/** Режимы, которые обращаются к интернету через Exa. */
export const WEB_WORK_MODES = ["search", "reason", "research"] as const;

export type WebWorkMode = (typeof WEB_WORK_MODES)[number];

/** Подпись режима для интерфейса. */
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  chat: "Каталог",
  search: "Поиск",
  reason: "Рассуждение",
  research: "Ресёрч",
};

/** Короткое пояснение режима: что он делает и чего ждать. */
export const WORK_MODE_HINTS: Record<WorkMode, string> = {
  chat: "Ответ по данным каталога Швейки. Быстро и точно.",
  search: "Ищет в интернете и сверяет с каталогом. Обычно 5–10 секунд.",
  reason: "Разбирает задачу по шагам, при необходимости сверяясь с интернетом.",
  research: "Много запросов в интернет и отчёт со ссылками. Обычно 20–40 секунд.",
};

export const isWorkMode = (value: unknown): value is WorkMode =>
  typeof value === "string" && (WORK_MODES as readonly string[]).includes(value);

export const isWebWorkMode = (value: unknown): value is WebWorkMode =>
  typeof value === "string" && (WEB_WORK_MODES as readonly string[]).includes(value);
