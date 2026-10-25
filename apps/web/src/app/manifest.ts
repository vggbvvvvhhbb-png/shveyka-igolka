import type { MetadataRoute } from "next";

/**
 * Манифест PWA: позволяет поставить сайт на телефон и открывать офлайн.
 *
 * Иконки лежат в public/icons — это статические файлы, а не компоненты.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Швейка — помощник по шитью",
    short_name: "Швейка",
    description: "Каталог тканей, швов и проектов для домашней швейной машины Brother LS-200s",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ru",
    background_color: "#fafaf9",
    theme_color: "#c2410c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
