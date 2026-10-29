/** Режимы ответа: коротко, по шагам или с объяснением. */
export const ANSWER_MODES = ["short", "steps", "why"] as const;
export type AnswerMode = (typeof ANSWER_MODES)[number];

const INSTRUCTION: Record<AnswerMode, string> = {
  short: "Режим «Коротко»: ответь в 1–3 предложениях, без вступлений и перечислений.",
  steps:
    "Режим «По шагам»: ответь пронумерованным списком действий, по одному на пункт. " +
    "К каждому пункту добавь пояснение, что и зачем делать.",
  why: "Режим «Почему»: объясни, почему рекомендованы именно эти настройки, опираясь только на данные каталога.",
};

/**
 * Бюджет токенов по режиму.
 *
 * Общий лимит 700 обрывал пошаговые ответы, поэтому у каждого режима своя
 * сумма, а режим без выбора получает обычный бюджет.
 *
 * Суммы подняты после замера: модель укладывалась в лимит с большим запасом,
 * а ответы выходили скудными — не хватало места на разделы и детали.
 * Замер показал и другое: при потолке в 2000 токенов модель дописывала
 * ответ до 1300 и останавливалась сама, поэтому бюджет поднят с запасом —
 * ограничивать должен промт, а не лимит токенов.
 */
const TOKENS: Record<AnswerMode | "default", number> = {
  short: 700,
  steps: 3200,
  why: 3000,
  default: 3000,
};

export const isAnswerMode = (v: unknown): v is AnswerMode =>
  typeof v === "string" && (ANSWER_MODES as readonly string[]).includes(v);

export const modeInstruction = (m: AnswerMode | null): string => (m ? INSTRUCTION[m] : "");

export const maxTokensFor = (m: AnswerMode | null): number => TOKENS[m ?? "default"];
