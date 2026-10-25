import { normalizeBaseUrl } from "@shveyka/core";

/**
 * Публичный адрес сайта.
 *
 * Задаётся `NEXT_PUBLIC_SITE_URL`; без него — localhost для разработки.
 * Адрес нужен для sitemap, robots.txt и абсолютных ссылок в разметке.
 */
export const SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);

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
] as const;
