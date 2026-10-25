import { MemoryRateStore, type RateStore } from "@shveyka/core";

/**
 * Общий счётчик запросов в Upstash Redis через REST.
 *
 * Нужен, когда сайт запущен в нескольких инстансах: счётчик в памяти процесса
 * тогда считает запросы каждого инстанса отдельно и лимит не работает.
 *
 * Зависимостей нет — обычный fetch по REST API Redis.
 */
export class UpstashRateStore implements RateStore {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async hit(key: string, windowSec: number): Promise<number> {
    // Ключ меняется вместе с окном: счётчик сам истекает без удаления ключей.
    const bucket = Math.floor(Date.now() / (windowSec * 1000));
    const k = `rl:${key}:${bucket}`;

    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", k],
        ["EXPIRE", k, String(windowSec * 2)],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) throw new Error(`Upstash: HTTP ${res.status}`);

    const data = (await res.json()) as { result?: unknown }[];
    const n = Number(data[0]?.result);
    if (!Number.isFinite(n)) throw new Error("Upstash: неожиданный ответ");

    return n;
  }
}

const g = globalThis as unknown as { __shveykaRateStore?: RateStore };

/**
 * Хранилище счётчика: Upstash, если заданы UPSTASH_REDIS_REST_URL и
 * UPSTASH_REDIS_REST_TOKEN, иначе память процесса.
 *
 * Хранилище живёт в globalThis: на сервере Next.js модуль пересоздаётся при
 * каждой горячей перезагрузке, а счётчик должен переживать её.
 */
export function getRateStore(): RateStore {
  if (!g.__shveykaRateStore) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    g.__shveykaRateStore =
      url && token ? new UpstashRateStore(url.replace(/\/$/, ""), token) : new MemoryRateStore();
  }
  return g.__shveykaRateStore;
}
