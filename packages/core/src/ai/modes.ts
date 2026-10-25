/** Режимы ответа: коротко, по шагам или с объяснением. */
export const ANSWER_MODES = ["short", "steps", "why"] as const;
export type AnswerMode = (typeof ANSWER_MODES)[number];

const INSTRUCTION: Record<AnswerMode, string> = {
  short: "Режим «Коротко»: ответь в 1–3 предложениях, без вступлений и перечислений.",
  steps: "Режим «По шагам»: ответь пронумерованным списком коротких действий, по одному на пункт.",
  why: "Режим «Почему»: объясни, почему рекомендованы именно эти настройки, опираясь только на данные каталога.",
};

/**
 * Бюджет токенов по режиму.
 *
 * Общий лимит 700 обрывал пошаговые ответы, поэтому у каждого режима своя
 * сумма, а режим без выбора получает обычный бюджет.
 */
const TOKENS: Record<AnswerMode | "default", number> = {
  short: 400,
  steps: 1400,
  why: 900,
  default: 1200,
};

export const isAnswerMode = (v: unknown): v is AnswerMode =>
  typeof v === "string" && (ANSWER_MODES as readonly string[]).includes(v);

export const modeInstruction = (m: AnswerMode | null): string => (m ? INSTRUCTION[m] : "");

export const maxTokensFor = (m: AnswerMode | null): number => TOKENS[m ?? "default"];
