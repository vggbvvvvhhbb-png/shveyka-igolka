import { normalizeBaseUrl } from "@shveyka/core";

/**
 * Публичный адрес сайта.
 *
 * Задаётся `NEXT_PUBLIC_SITE_URL`; без него — localhost для разработки.
 * Адрес нужен для sitemap, robots.txt и абсолютных ссылок в разметке.
 */
export const SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * Адрес Telegram-бота Швейки.
 *
 * Задаётся `NEXT_PUBLIC_TELEGRAM_BOT_URL`; по умолчанию — бот в проде
 * (@shveyka_igolka_bot). Адрес нужен кнопкам «Открыть бота» в подвале
 * и на странице помощника.
 */
export const TELEGRAM_BOT_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "https://t.me/shveyka_igolka_bot";

/**
 * Страницы без динамических сегментов, которые попадают в sitemap.
 *
 * Личные страницы (мерки, журнал) сюда не входят: их нет в индексе.
 */
export const STATIC_PAGES = [
  "/fabrics",
  "/seams",
  "/projects",
  "/assistant",
  "/start",
  "/calculator",
  "/profit",
  "/analog",
  "/hardware",
  "/care",
  "/rules",
  "/contacts",
] as const;
