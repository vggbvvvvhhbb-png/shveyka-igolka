/**
 * Источник из интернета: результат поиска Exa, приведённый к виду, который
 * удобно показать человеку.
 *
 * Тип живёт отдельно от клиента Exa, потому что его используют и БД, и UI.
 */

/** Одна найденная страница: заголовок, адрес, короткая выдержка из текста. */
export type Source = {
  title: string;
  url: string;
  /** Короткая выдержка из страницы: обычно первый highlight Exa. */
  snippet: string;
  /** Дата публикации, если страница её содержит. */
  date?: string;
};

/**
 * Проверяет, что ссылку безопасно показывать в интерфейсе.
 *
 * В ответы попадают адреса из интернета, поэтому схемы разрешены только
 * http и https: javascript:, data: и прочее в ссылке не показываем.
 */
export function isSafeSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Короткая подпись источника: домен без «www.».
 *
 * Показывается рядом с заголовком, чтобы человек видел, откуда взялась
 * ссылка, не открывая её.
 */
export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Дата источника в понятном виде: «12 марта 2025».
 *
 * Возвращает пустую строку, если даты нет или она не разбирается.
 */
export function formatSourceDate(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}
