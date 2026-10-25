/**
 * Замок владельца.
 *
 * Мерки — это одна запись в базе, а сайт публичный: первый посетитель
 * перезапишет мерки владельца, и хуже того — помощник подставит их в ответ
 * любому. Минимальная мера без системы аккаунтов: «сайт = один владелец».
 *
 * Если OWNER_KEY не задан, всё работает как раньше: личные страницы открыты.
 */

/**
 * Сравнение строк за постоянное время.
 *
 * Без node:crypto, чтобы работать и в Edge-среде. Длина сравнивается
 * отдельно, чтобы строки разной длины отличались так же явно, как разные
 * символы.
 */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return diff === 0;
}

/** Имя cookie, в котором лежит ключ владельца. */
export const OWNER_COOKIE = "shveyka_owner";

/**
 * Значение cookie по имени.
 *
 * Разбирает строку `Cookie` вручную: в Edge нет доступа к cookie-парсеру
 * Next.js, а нужны только наши собственные значения.
 */
export function readCookie(header: string | null | undefined, name: string): string {
  if (!header) return "";

  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        // Битое значение — считаем, что cookie нет.
        return "";
      }
    }
  }

  return "";
}

/**
 * Запрос от владельца?
 *
 * Ключ не задан → да (обратная совместимость). Ключ задан → да только если
 * cookie совпадает с ключом.
 */
export function isOwner(
  cookieHeader: string | null | undefined,
  secret: string | undefined
): boolean {
  if (!secret) return true;
  return safeEqual(readCookie(cookieHeader, OWNER_COOKIE), secret);
}
