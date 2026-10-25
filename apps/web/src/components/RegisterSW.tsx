"use client";

import { useEffect } from "react";

/**
 * Страницы каталога — их имеет смысл сохранить для работы без сети.
 *
 * Список берётся из sitemap: он всегда совпадает с каталогом, и серверному
 * коду не нужно тянуть базу ради списка ссылок.
 */
const CATALOG = /^\/(fabrics|seams|projects)(\/|$)/;

/** Адреса страниц каталога из sitemap.xml. */
async function catalogUrls(): Promise<string[]> {
  try {
    const res = await fetch("/sitemap.xml", { cache: "no-store" });
    if (!res.ok) return [];

    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");

    return Array.from(doc.getElementsByTagName("loc"))
      .map((node) => node.textContent ?? "")
      .map((url) => {
        try {
          return new URL(url, location.origin).pathname;
        } catch {
          return "";
        }
      })
      .filter((path) => CATALOG.test(path));
  } catch {
    return [];
  }
}

/**
 * Регистрирует service worker и один раз прогревает каталог для офлайна.
 *
 * Worker регистрируется только в production: в разработке он мешал бы видеть
 * свежие изменения страниц.
 */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;

    // При включённой экономии трафика каталог не прогреваем: пользователь
    // сам просил не тратить интернет.
    if (connection?.saveData) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(async (reg) => {
        const worker = reg.active ?? reg.waiting ?? reg.installing;
        if (!worker) return;

        const urls = await catalogUrls();
        if (urls.length === 0) return;

        worker.postMessage({ type: "warm", urls });
      })
      .catch(() => undefined);
  }, []);

  return null;
}
