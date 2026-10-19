/**
 * Часть текста: обычная или совпавшая с поисковым запросом.
 */
export type HighlightedPart = {
  text: string;
  highlighted: boolean;
};

/**
 * Делит текст на части, отмечая вхождения поискового запроса.
 *
 * Регистр не учитывается. Пустой запрос возвращает текст одним куском.
 * Возвращается массив чередующихся частей: обычная, подсвеченная, обычная…
 */
export function splitHighlightedText(text: string, query: string): HighlightedPart[] {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0 || text.length === 0) {
    return [{ text, highlighted: false }];
  }

  const haystack = text.toLowerCase();
  const parts: HighlightedPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = haystack.indexOf(needle, cursor);

    if (found === -1) {
      parts.push({ text: text.slice(cursor), highlighted: false });
      break;
    }

    if (found > cursor) {
      parts.push({ text: text.slice(cursor, found), highlighted: false });
    }

    parts.push({ text: text.slice(found, found + needle.length), highlighted: true });
    cursor = found + needle.length;
  }

  return parts;
}
