/**
 * Экранирование текста для Telegram в режиме HTML.
 *
 * Telegram ломается на < > &, поэтому всё, что пришло от пользователя или из
 * базы, нужно экранировать.
 */

/** Экранирует &, < и >. */
export const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Список с буллетами. */
export const bullets = (items: string[]): string => items.map((t) => `• ${esc(t)}`).join("\n");

/** Блок с заголовком и списком. Пустой список — пустая строка. */
export const section = (title: string, items: string[]): string =>
  items.length ? `<b>${esc(title)}</b>\n${bullets(items)}` : "";
