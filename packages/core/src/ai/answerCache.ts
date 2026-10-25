/**
 * Кэш ответов помощника.
 *
 * Один и тот же вопрос приходит снова и снова: «какая игла для джинсы» спрашивают
 * чаще всего. Ответ на такой вопрос не зависит от того, кто его задал, поэтому
 * его можно отдать из кэша и не платить провайдеру.
 */

/** 53-битный хэш cyrb53: без зависимостей, одинаков на сервере и в Edge. */
export function hashString(s: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/** Вопрос приводится к общему виду: регистр, «ё» и знаки препинания не важны. */
export const normalizeQuestion = (q: string): string =>
  q
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Ключ кэша: режим + вопрос + записи контекста + версия каталога.
 *
 * Версия каталога — самая свежая updated_at: правка любой записи меняет
 * ключи всех ответов, поэтому старые копии устаревают сами.
 */
export function cacheKey(o: {
  question: string;
  slugs: readonly string[];
  mode: string | null;
  catalogVersion: string;
}): string {
  const payload = [
    normalizeQuestion(o.question),
    [...o.slugs].sort().join(","),
    o.catalogVersion,
  ].join("|");
  return `${o.mode ?? "default"}:${hashString(payload)}`;
}

/**
 * Кэшируем только ответы, не зависящие от личных данных и предыдущих реплик.
 *
 * Ответ с мерками — личный, а продолжение диалога — про контекст переписки,
 * оба нельзя отдавать другому посетителю.
 */
export const isCacheable = (o: { hasHistory: boolean; usesMeasurements: boolean }): boolean =>
  !o.hasHistory && !o.usesMeasurements;

/** Кэш с временем жизни и вытесением по давности обращения. */
export class TtlLruCache<V> {
  private readonly map = new Map<string, { v: V; exp: number }>();

  constructor(
    private readonly max = 500,
    private readonly ttlMs = 24 * 3600_000,
    private readonly now: () => number = Date.now
  ) {}

  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.exp <= this.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Обновляем «свежесть» в порядке вставки — так работает вытеснение LRU.
    this.map.delete(key);
    this.map.set(key, e);
    return e.v;
  }

  set(key: string, v: V): void {
    this.map.delete(key);
    this.map.set(key, { v, exp: this.now() + this.ttlMs });
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }

  get size(): number {
    return this.map.size;
  }
}

/**
 * Повтор готового ответа потоком.
 *
 * `frame` оборачивает кусок в формат клиента (например, SSE).
 */
export function textToStream(
  text: string,
  frame: (chunk: string) => string = (c) => c,
  size = 48
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;

  return new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (i >= text.length) return ctrl.close();
      ctrl.enqueue(enc.encode(frame(text.slice(i, i + size))));
      i += size;
    },
  });
}
