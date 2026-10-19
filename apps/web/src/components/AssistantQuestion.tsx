/**
 * Вопрос, переданный на страницу помощника через адресную строку.
 *
 * Значение приходит извне, поэтому перед показом его нужно очистить
 * от управляющих символов и ограничить по длине.
 */

/** Сколько символов разрешено в вопросе. */
export const MAX_QUESTION_LENGTH = 300;

/**
 * Убирает управляющие символы: в вопросе им не место.
 * На их месте оставляем пробел, чтобы слова не слипались.
 */
function stripControlCharacters(value: string): string {
  return Array.from(value)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? " " : char;
    })
    .join("");
}

/**
 * Готовит вопрос из значения searchParams: убирает управляющие символы,
 * сжимает пробелы и обрезает до MAX_QUESTION_LENGTH.
 * Пустое значение — значит null.
 */
export function parseAssistantQuestion(raw: string | string[] | undefined | null): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = stripControlCharacters(value).replace(/\s+/g, " ").trim();

  if (cleaned.length === 0) {
    return null;
  }

  if (cleaned.length <= MAX_QUESTION_LENGTH) {
    return cleaned;
  }

  // Обрезаем по границе слова, чтобы вопрос не заканчивался половиной слова.
  const cut = cleaned.slice(0, MAX_QUESTION_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > MAX_QUESTION_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;
}

/**
 * Готовый вопрос для экрана помощника.
 * Если вопроса нет, компонент ничего не показывает.
 */
export function AssistantQuestion({ raw }: { raw?: string | string[] | null }) {
  const question = parseAssistantQuestion(raw);

  if (!question) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-sm text-stone-500">Ваш вопрос</p>
      <p className="mt-1 text-stone-800 leading-relaxed">{question}</p>
    </div>
  );
}
