const LENGTH_REASONS = new Set(["length", "max_tokens"]);
const TERMINAL = /[.!?…)»":;\]]\s*$/;

/**
 * Ответ оборван: провайдер сообщил про лимит токенов или текст кончается
 * на полуслове.
 */
export function looksTruncated(text: string, finishReason?: string | null): boolean {
  if (finishReason && LENGTH_REASONS.has(finishReason)) return true;
  const t = text.trimEnd();
  return t.length > 0 && !TERMINAL.test(t) && !/\d$/.test(t);
}

/** Пометка в конце оборванного ответа: подсказывает, что делать дальше. */
export const CONTINUE_NOTE =
  "\n\n_Ответ получился длинным и оборвался. Напишите «продолжи» — допишу._";
