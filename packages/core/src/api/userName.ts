/**
 * Имя пользователя Telegram в заголовке запроса.
 *
 * Имя в Telegram бывает на русском, а значение HTTP-заголовка — байтовая
 * строка: кириллица в нём ломает запрос на стороне Node («Cannot convert
 * argument to a ByteString»), и бот отвечает «Сайт сейчас недоступен».
 * Поэтому бот кодирует имя, а сайт декодирует.
 */

/** Заголовок, которым бот передаёт имя пользователя Telegram. */
export const BOT_USER_NAME_HEADER = "x-shveyka-user-name";

/** Кодирует имя для заголовка. */
export function encodeUserName(name: string): string {
  return encodeURIComponent(name.trim());
}

/**
 * Декодирует имя из заголовка.
 *
 * Если значение пришло не в кодированном виде, оно возвращается как есть:
 * потерять имя из-за битой кодировки хуже, чем показать его как было.
 */
export function decodeUserName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const decoded = decodeURIComponent(trimmed);
    return decoded.trim().length > 0 ? decoded : null;
  } catch {
    return trimmed;
  }
}
