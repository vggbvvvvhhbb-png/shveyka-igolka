/**
 * Счётчик запросов в окне.
 *
 * Реализации: память процесса (один инстанс) и Upstash Redis (общий счётчик
 * для нескольких инстансов). Интерфейс общий, поэтому маршруту не важно,
 * где считается.
 */
export interface RateStore {
  /** Увеличивает счётчик ключа в текущем окне и возвращает новое значение. */
  hit(key: string, windowSec: number): Promise<number>;
}

/** Счётчик в памяти процесса: подходит для одного инстанса и для разработки. */
export class MemoryRateStore implements RateStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async hit(key: string, windowSec: number): Promise<number> {
    const t = this.now();

    // Окна, которые истекли, больше не нужны: чистим, пока не наело.
    if (this.buckets.size > 5000) {
      for (const [k, b] of this.buckets) if (b.resetAt <= t) this.buckets.delete(k);
    }

    const b = this.buckets.get(key);
    if (!b || b.resetAt <= t) {
      this.buckets.set(key, { count: 1, resetAt: t + windowSec * 1000 });
      return 1;
    }
    return ++b.count;
  }
}

export interface LimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Проверка лимита.
 *
 * При сбое внешнего хранилища запрос пропускается: недоступный Redis не
 * должен класть чат. Ошибка уходит в onError, чтобы её можно было найти в логе.
 */
export async function checkLimit(
  store: RateStore,
  key: string,
  limit: number,
  windowSec: number,
  onError?: (e: unknown) => void
): Promise<LimitResult> {
  try {
    const count = await store.hit(key, windowSec);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (e) {
    onError?.(e);
    return { allowed: true, remaining: limit };
  }
}
