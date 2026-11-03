import { Caveat, Cormorant_Garamond, Golos_Text, Playfair_Display } from "next/font/google";

/**
 * Шрифты «Атласа домашнего шитья».
 *
 * Все четыре начертания — с кириллицей, набор латиницы подключён, чтобы
 * курсивные «латинские» строки и римские цифры не подменялись системными.
 *
 * next/font скачивает файлы на сборке и отдаёт их с сайта: внешних запросов
 * к Google Fonts в рантайме нет, поэтому страница не зависит от чужого CDN.
 */

/** Заголовки таблиц: крупный каллиграфический антиквенный. */
export const playfair = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  weight: ["800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

/** Курсивные «латинские» строки, римские цифры и цитаты. */
export const cormorant = Cormorant_Garamond({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/** Основной текст и подписи разделов. Русский гарнитур. */
export const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-golos",
  display: "swap",
});

/** Рукописные пометки на полях. */
export const caveat = Caveat({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "600"],
  variable: "--font-caveat",
  display: "swap",
});

/** Все классы разом — навешиваются на <html>. */
export const fontVariables = [
  playfair.variable,
  cormorant.variable,
  golos.variable,
  caveat.variable,
].join(" ");
