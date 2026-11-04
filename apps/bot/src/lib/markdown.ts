/**
 * Перевод ответа помощника в разметку Telegram.
 *
 * Помощник отвечает в markdown: заголовки, списки, выделение, ссылки.
 * Telegram понимает свой набор тегов, поэтому текст переводится в HTML:
 * `## Заголовок` → `<b>Заголовок</b>`, `[текст](/link)` → ссылка.
 *
 * Внутренние ссылки каталога ведут на сайт: в телеграме открыть путь
 * `/fabrics/linen-natural` нельзя, нужен полный адрес.
 */

import { config } from "../config";
import { esc } from "./html";

/**
 * Встроенное выделение: жирное, код, ссылка, курсив.
 *
 * В адресе ссылки допускаются круглые скобки: без этого адрес вида
 * `javascript:alert(1)` обрывался бы на первой скобке и оставалась бы
 * мусорная часть.
 */
const INLINE =
  /\*\*([^*\n]+)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\(([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)\)|\*([^*\n]+)\*/g;

/** Заголовок раздела. */
const HEADING = /^(#{1,6})\s+(.*)$/;

/** Пункт списка. */
const BULLET = /^[-*•]\s+(.*)$/;

/** Нумерованный пункт списка. */
const ORDERED = /^(\d{1,2})[.)]\s+(.*)$/;

/** Ссылка на страницу сайта: /fabrics/linen-natural. */
const INTERNAL = /^\/(?:fabrics|seams|projects)\/[a-z0-9-]+$/;

/**
 * Адрес, который можно поставить в ссылку.
 *
 * Внутренние ссылки становятся полными адресами сайта, внешние остаются
 * как есть. Остальное (javascript:, data:) в ссылку не попадает.
 */
function safeHref(href: string): string | null {
  if (INTERNAL.test(href)) {
    return config.siteUrl ? `${config.siteUrl}${href}` : null;
  }
  if (href.startsWith("https://") || href.startsWith("http://")) return href;
  return null;
}

/** Переводит куски текста внутри абзаца. */
function inlineToHtml(text: string): string {
  const escaped = esc(text);
  return escaped.replace(INLINE, (whole, bold, code, linkText, linkHref, italic) => {
    if (bold !== undefined) return `<b>${bold}</b>`;
    if (code !== undefined) return `<code>${code}</code>`;
    if (linkText !== undefined && linkHref !== undefined) {
      const href = safeHref(linkHref);
      return href ? `<a href="${href}">${linkText}</a>` : linkText;
    }
    if (italic !== undefined) return `<i>${italic}</i>`;
    return whole;
  });
}

/**
 * Переводит ответ помощника из markdown в HTML Telegram.
 *
 * Пустые строки между блоками сохраняются: так ответ читается так же, как
 * на сайте.
 */
export function markdownToTelegramHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();

    if (line.length === 0) {
      out.push("");
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      out.push(`<b>${inlineToHtml(heading[2])}</b>`);
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      out.push(`• ${inlineToHtml(bullet[1])}`);
      continue;
    }

    const ordered = ORDERED.exec(line);
    if (ordered) {
      out.push(`${ordered[1]}. ${inlineToHtml(ordered[2])}`);
      continue;
    }

    out.push(inlineToHtml(line));
  }

  // Подряд идущие пустые строки схлопываются: в телеграме они лишние.
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
