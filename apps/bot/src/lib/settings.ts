/**
 * Настройки бота по умолчанию и правила их подстановки.
 *
 * Здесь только чистая логика: без dotenv и без Telegram — её можно проверить
 * обычным тестом. Сам config.ts читает переменные окружения и зовёт эти
 * функции.
 */

/**
 * Боевой адрес мастерской.
 *
 * Ссылки из постов в канале и из сообщений бота читают другие люди, поэтому
 * по умолчанию бот ведёт на боевой домен, а не на машину, где он запущен.
 */
export const DEFAULT_SITE_URL = "https://shveyka-igolka.ru";

/** Чат канала мастерской (@shveyka_igolka). */
export const DEFAULT_CHANNEL_ID = "-1003839377564";

/** Владелец мастерской — @Anon1074. Ему открыта публикация в канал. */
export const DEFAULT_OWNER_ID = 958786436;

/**
 * Адрес, который открывается только на самой машине бота.
 *
 * Такие ссылки читателям бесполезны: у них localhost не открывается.
 */
export function isLocalAddress(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(url.trim());
}

/**
 * Адрес сайта для ссылок бота.
 *
 * Переменная SITE_URL главнее всего. Но если её нет или она смотрит на
 * localhost, берём боевой домен: посты в канале читают со стороны. Явно
 * пустая SITE_URL — как и раньше: ссылок на сайт не будет вовсе.
 *
 * Адрес возвращается без слеша в конце: к нему приклеиваются пути страниц.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  if (raw === undefined) return DEFAULT_SITE_URL;
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const url = isLocalAddress(trimmed) ? DEFAULT_SITE_URL : trimmed;
  return url.replace(/\/+$/, "");
}

/**
 * Чат канала, куда бот пишет посты.
 *
 * Пустая переменная или её отсутствие — канал мастерской: бот сам ничего не
 * публикует, пост уходит только по команде владельца, но канал указан в
 * боевых настройках один раз.
 */
export function resolveChannelId(raw: string | undefined): string {
  if (raw === undefined) return DEFAULT_CHANNEL_ID;
  const trimmed = raw.trim();
  return trimmed === "" ? DEFAULT_CHANNEL_ID : trimmed;
}

/**
 * Кто может публиковать в канал.
 *
 * Свой список OWNER_USER_IDS главнее всего. Если его нет — берём список
 * тех, кому открыт сам бот (у приватного бота это и есть владелец). Если и
 * его нет — остаётся владелец мастерской по умолчанию: иначе пост в канал
 * не отправить ни с телефона, ни из консоли.
 */
export function resolveOwnerIds(own: number[], allowed: number[]): number[] {
  if (own.length > 0) return own;
  if (allowed.length > 0) return allowed;
  return [DEFAULT_OWNER_ID];
}
