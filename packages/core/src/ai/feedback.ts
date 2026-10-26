export type FeedbackRating = "up" | "down";

export interface FeedbackInput {
  messageId: string;
  rating: FeedbackRating;
  comment: string | null;
  /** Записи каталога («тип/slug»), которые попали в контекст ответа. */
  contextSlugs: string[];
}

export type FeedbackValidation = { ok: true; value: FeedbackInput } | { ok: false; error: string };

export const FEEDBACK_COMMENT_MAX = 500;
const MAX_SLUGS = 20;
const SLUG_PATTERN = /^[\w-]{1,40}\/[\w-]{1,80}$/;

/** Проверяет тело запроса «оценить ответ помощника». */
export function validateFeedback(body: unknown): FeedbackValidation {
  if (!body || typeof body !== "object") return { ok: false, error: "Некорректный запрос" };
  const raw = body as Record<string, unknown>;

  if (
    typeof raw.messageId !== "string" ||
    raw.messageId.length === 0 ||
    raw.messageId.length > 64
  ) {
    return { ok: false, error: "Не указано сообщение" };
  }
  if (raw.rating !== "up" && raw.rating !== "down") {
    return { ok: false, error: "Некорректная оценка" };
  }

  let comment: string | null = null;
  if (raw.comment !== undefined && raw.comment !== null) {
    if (typeof raw.comment !== "string") return { ok: false, error: "Некорректный комментарий" };
    const trimmed = raw.comment.trim();
    if (trimmed.length > FEEDBACK_COMMENT_MAX) {
      return { ok: false, error: `Комментарий не длиннее ${FEEDBACK_COMMENT_MAX} символов` };
    }
    comment = trimmed || null;
  }

  const contextSlugs = Array.isArray(raw.contextSlugs)
    ? raw.contextSlugs
        .filter((s): s is string => typeof s === "string" && SLUG_PATTERN.test(s))
        .slice(0, MAX_SLUGS)
    : [];

  return {
    ok: true,
    value: { messageId: raw.messageId, rating: raw.rating, comment, contextSlugs },
  };
}
