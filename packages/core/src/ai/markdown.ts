/**
 * Разбор разметки ответа модели.
 *
 * Модели отвечают в разметке: заголовки, списки, выделение. Показывать такой
 * текст как есть неудобно — видны служебные символы. При этом вставлять ответ
 * в страницу через innerHTML нельзя: текст приходит из интернета.
 *
 * Поэтому разметка разбирается здесь, в ядре, в обычные данные — а интерфейс
 * превращает их в элементы React. Никакого сырого HTML: в разметке есть
 * только то, что перечислено в типах ниже.
 */

/** Кусок текста внутри абзаца. */
export type MdInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "citation"; index: number };

/** Блок ответа. */
export type MdBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "rule" };

/** Заголовок: одна-четыре решётки. */
const HEADING = /^(#{1,6})\s+(.*)$/;

/** Горизонтальная линия: три и больше одинаковых знаков. */
const RULE = /^([-*_])\s*(?:\1\s*){2,}$/;

/** Пункт списка. */
const BULLET = /^[-*•]\s+(.*)$/;

/** Пунет нумерованного списка. */
const ORDERED = /^(\d{1,2})[.)]\s+(.*)$/;

/** Цитата. */
const QUOTE = /^>\s?(.*)$/;

/**
 * Встроенный кусок текста.
 *
 * Порядок важен: сначала выделение, потом код, потом ссылка, потом ссылка на
 * источник [1], и только потом курсив — иначе `**жирный**` разобрался бы как
 * курсив.
 */
const INLINE =
  /\*\*([^*\n]+)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|\[(\d{1,2})\]|\*([^*\n]+)\*/g;

/**
 * Разбирает текст на блоки: заголовки, абзацы, списки, цитаты, линии.
 */
export function parseMarkdown(text: string): MdBlock[] {
  const lines = text.split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const heading = HEADING.exec(trimmed);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: Math.min(4, heading[1].length),
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (RULE.test(trimmed)) {
      blocks.push({ kind: "rule" });
      i += 1;
      continue;
    }

    if (QUOTE.test(trimmed)) {
      const parts: string[] = [];
      while (i < lines.length) {
        const quote = QUOTE.exec(lines[i].trim());
        if (!quote) break;
        parts.push(quote[1]);
        i += 1;
      }
      blocks.push({ kind: "quote", text: parts.join(" ") });
      continue;
    }

    const bullet = BULLET.exec(trimmed);
    const ordered = ORDERED.exec(trimmed);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (i < lines.length) {
        const line = lines[i].trim();
        const bulletItem = BULLET.exec(line);
        const orderedItem = ORDERED.exec(line);
        if (isOrdered && orderedItem) {
          items.push(orderedItem[2]);
          i += 1;
          continue;
        }
        if (!isOrdered && bulletItem) {
          items.push(bulletItem[1]);
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }

    // Абзац: строки подряд, до пустой строки или следующего блока.
    const parts: string[] = [];
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) break;
      if (HEADING.test(line) || RULE.test(line) || QUOTE.test(line)) break;
      if (BULLET.test(line) || ORDERED.test(line)) break;
      parts.push(line);
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: parts.join(" ") });
  }

  return blocks;
}

/**
 * Разбирает текст на куски: обычный текст, выделение, код, ссылки.
 */
export function parseInline(text: string): MdInline[] {
  const inline: MdInline[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) inline.push({ kind: "text", text: text.slice(last, index) });

    const [whole, bold, code, linkText, linkHref, citation, italic] = match;
    if (bold !== undefined) {
      inline.push({ kind: "bold", text: bold });
    } else if (code !== undefined) {
      inline.push({ kind: "code", text: code });
    } else if (linkText !== undefined && linkHref !== undefined) {
      inline.push({ kind: "link", text: linkText, href: linkHref });
    } else if (citation !== undefined) {
      inline.push({ kind: "citation", index: Number(citation) });
    } else if (italic !== undefined) {
      inline.push({ kind: "italic", text: italic });
    }

    last = index + whole.length;
  }

  if (last < text.length) inline.push({ kind: "text", text: text.slice(last) });
  return inline;
}

/**
 * Проверяет, что ссылку можно показывать.
 *
 * Разрешены только адреса интернета (http, https) и внутренние страницы
 * сайта (с ведущей косой чертой). Остальное — javascript:, data: и прочее —
 * не показываем.
 */
export function isSafeLinkHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//");
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Внутренняя ссылка на запись каталога: `/fabrics/denim`. */
const CATALOG_LINK = /^\/(?:fabrics|seams|projects)\/[a-z0-9-]+$/;

/** Тип и slug записи каталога из внутренней ссылки. */
export function catalogSlugOf(href: string): string | null {
  return CATALOG_LINK.test(href) ? href.slice(1) : null;
}
