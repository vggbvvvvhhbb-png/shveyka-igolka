/**
 * Пост в канал: текст и кнопки под ним.
 *
 * Текст и клавиатура собраны здесь, без сети и без Telegram: так их можно
 * проверить в тестах и переиспользовать и в боте, и в скрипте публикации.
 *
 * Кнопок ровно столько, сколько нужно: по две в ряд, внизу одна широкая
 * на сайт. Ничего лишнего — ряд «просто на всякий случай» выглядит как
 * натыканная панель, а не как приглашение.
 */

import { InlineKeyboard } from "grammy";

/** Адреса, из которых собраны кнопки поста. */
export interface ChannelLinks {
  /** Адрес сайта без слеша в конце. Пусто — кнопок на сайт не будет. */
  siteUrl: string;
  /** Логин бота без @. */
  botUsername: string;
}

/** Экранирование текста для HTML-режима Telegram. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Обрезает текст до лимита Telegram, не разрывая слова. */
export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Текст поста в канал.
 *
 * Короткий: что это за мастерская и что можно сделать. Перечисления
 * разделов здесь нет — они и так видны в кнопках.
 */
export function channelPostText(): string {
  return [
    "👗 Швейка на связи",
    "",
    "Мастерская «Швейка»: ткани, швы, проекты и калькуляторы для шитья дома.",
    "Здесь можно спросить, посчитать и разобраться по шагам — или открыть сайт и выбрать своё.",
    "",
    "Что сделать?",
  ].join("\n");
}

/** Ссылка на бота: с готовым сценарием, чтобы открылся нужный раздел. */
export function botLink(botUsername: string, payload = "ask"): string {
  const name = botUsername.trim().replace(/^@/, "");
  return payload ? `https://t.me/${name}?start=${payload}` : `https://t.me/${name}`;
}

/**
 * Проверка: пользователю можно публиковать в канал.
 *
 * Пустой список — публиковать не может никто: так бот не станет спамить
 * канал, если список владельцев забыли настроить.
 */
export function canPublish(userId: number | undefined, ownerIds: number[]): boolean {
  return typeof userId === "number" && ownerIds.includes(userId);
}

/**
 * Кнопки поста: две в ряд, внизу одна широкая на сайт.
 *
 * Порядок — как в меню бота: сначала расчёты, потом помощник, в конце сайт.
 */
export function channelKeyboard(links: ChannelLinks): InlineKeyboard {
  const site = links.siteUrl.trim().replace(/\/+$/, "");
  const kb = new InlineKeyboard();
  if (!site) {
    // Сайт не настроен — оставляем только бота, чтобы не было битых ссылок.
    return kb.url("🤖 Открыть бота", botLink(links.botUsername));
  }
  kb.url("🧵 Раскрой ткани", `${site}/calculator`)
    .url("💰 Выгодно ли шить?", `${site}/profit`)
    .row()
    .url("🔍 Аналог ткани", `${site}/analog`)
    .url("🧷 Фурнитура", `${site}/hardware`)
    .row()
    .url("🧼 Уход за тканью", `${site}/care`)
    .url("🤖 Спросить бота", botLink(links.botUsername))
    .row()
    .url("🌐 Открыть сайт", site);
  return kb;
}
