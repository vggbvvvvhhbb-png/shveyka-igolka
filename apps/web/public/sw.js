/*
 * Офлайн-каталог Швейки.
 *
 * Сценарий: швея в магазине тканей, сети нет. Сохранённые страницы каталога
 * должны открываться, помощник и личные страницы — нет.
 *
 * Файл лежит в public/ и отдаётся как есть: без сборки и без библиотек.
 */

/* Версия кэша: смена константы сбрасывает старые копии. */
const VERSION = "shveyka-v1";

/* Эти пути не кэшируются никогда: личные данные и то, что живёт только онлайн. */
const PRIVATE = ["/api/", "/measurements", "/journal", "/owner", "/assistant"];

const isPrivate = (pathname) => PRIVATE.some((p) => pathname.startsWith(p));

/* Кладём ответ в кэш, если он удачный. */
const put = (req, res) => {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.add("/offline"))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== "GET" || url.origin !== location.origin || isPrivate(url.pathname)) {
    return;
  }

  /* Статика Next.js: в имени файла есть хэш, поэтому кэш первым. */
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }

  /* Страницы: сеть первой, при сбое — копия из кэша, иначе страница «нет сети». */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => put(req, res))
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match("/offline"))
            .then((hit) => hit || Response.error())
        )
    );
  }
});

/*
 * Прогрев каталога.
 *
 * Страницы скачиваются пачками по шесть: так слабая сеть не забивается, а
 * пользователь не ждёт, пока прогрузятся все 57 страниц сразу.
 */
self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "warm" || !Array.isArray(e.data.urls)) return;

  const urls = e.data.urls.filter(
    (u) =>
      typeof u === "string" && u.startsWith("/") && !isPrivate(new URL(u, location.origin).pathname)
  );

  e.waitUntil(
    (async () => {
      for (let i = 0; i < urls.length; i += 6) {
        await Promise.all(
          urls.slice(i, i + 6).map((u) =>
            fetch(u)
              .then((r) => put(new Request(u), r))
              .catch(() => undefined)
          )
        );
      }
    })()
  );
});
