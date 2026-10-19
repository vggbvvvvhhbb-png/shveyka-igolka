/**
 * Описание фрагментов ответа ассистента: обычный текст или ссылка на каталог.
 * React-элементы здесь не создаются — чистая логика остаётся тестируемой
 * без react-dom (apps/web рендерит эти дескрипторы через next/link).
 */
export type LinkSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

const LINK_PATTERN = /\[([^\]]+)\]\((\/(?:fabrics|seams|projects)\/[a-z0-9-]+)\)/g;

function slugOf(href: string): string {
  return href.slice(1); // "/fabrics/denim" -> "fabrics/denim"
}

/**
 * Разбирает ответ модели на сегменты. Ссылки вида [название](/тип/slug)
 * остаются ссылками только если "тип/slug" есть в allowedSlugs.
 * Иначе скобки Markdown снимаются и возвращается просто текст,
 * чтобы UI не делал битую ссылку на несуществующую запись каталога.
 */
export function parseLinkSegments(text: string, allowedSlugs: Set<string>): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ kind: "text", text: text.slice(last, index) });
    const label = match[1];
    const href = match[2];
    if (allowedSlugs.has(slugOf(href))) {
      segments.push({ kind: "link", text: label, href });
    } else {
      segments.push({ kind: "text", text: label });
    }
    last = index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

/**
 * То же, что parseLinkSegments, но возвращает строку: ссылки разрешены,
 * остальные — только текст. Используется для проверок и тестов.
 */
export function stripUnknownLinks(text: string, allowedSlugs: Set<string>): string {
  return parseLinkSegments(text, allowedSlugs)
    .map((s) => (s.kind === "link" ? `[${s.text}](${s.href})` : s.text))
    .join("");
}
