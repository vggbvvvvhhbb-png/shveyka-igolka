import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DatabaseClient = ReturnType<typeof createClient>;

type PoolGlobals = typeof globalThis & {
  __shveyka_pool__?: DatabaseClient;
  __shveyka_pg_pool__?: Pool;
  __shveyka_shutdown__?: { handler: () => void };
};

/**
 * Создаёт пул pg с настройками приложения.
 */
function createPool(connectionString: string): Pool {
  const isDev = process.env.NODE_ENV !== "production";
  return new Pool({
    connectionString,
    max: 5,
    min: isDev ? 2 : 2,
    idleTimeoutMillis: isDev ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    ssl: { rejectUnauthorized: false },
  });
}

/**
 * Оборачивает пул pg в типизированный клиент Drizzle ORM.
 */
function createClient(pool: Pool) {
  return drizzle(pool, { schema });
}

/**
 * Creates a typed Drizzle ORM client backed by a pg Pool.
 *
 * Каждый вызов создаёт собственный пул — предназначено для одноразовых
 * скриптов (seed). В приложении используй getDbSingleton.
 */
export function createDbClient(connectionString: string): DatabaseClient {
  return createClient(createPool(connectionString));
}

/**
 * Снимает обработчик SIGTERM, если он был зарегистрирован.
 */
function unregisterShutdown(): void {
  const globals = globalThis as PoolGlobals;
  const shutdown = globals.__shveyka_shutdown__;
  if (!shutdown) return;
  process.off("SIGTERM", shutdown.handler);
  globals.__shveyka_shutdown__ = undefined;
}

/**
 * Регистрирует обработчик SIGTERM ровно один раз на процесс.
 *
 * Раньше обработчик добавлялся внутри createDbClient, то есть на каждый
 * вызов пула: число слушателей процесса росло и в итоге срабатывало
 * предупреждение MaxListenersExceededWarning.
 */
function registerShutdown(): void {
  const globals = globalThis as PoolGlobals;
  if (globals.__shveyka_shutdown__) return;

  const handler = () => {
    console.log("[db] Received SIGTERM, ending pool…");
    void closeDbPool();
  };

  globals.__shveyka_shutdown__ = { handler };
  process.on("SIGTERM", handler);
}

/**
 * Закрывает кешированный пул и снимает обработчик SIGTERM.
 */
export async function closeDbPool(): Promise<void> {
  const globals = globalThis as PoolGlobals;
  const pool = globals.__shveyka_pg_pool__;
  unregisterShutdown();
  globals.__shveyka_pg_pool__ = undefined;
  globals.__shveyka_pool__ = undefined;
  if (pool) {
    await pool.end().catch(() => {});
  }
}

/**
 * Возвращает кешированный клиент БД.
 *
 * Кеш нужен во всех окружениях, а не только в dev: на serverless-хостинге
 * новый пул на каждый запрос быстро исчерпывает лимит соединений Postgres.
 */
export function getDbSingleton(
  connectionString: string = process.env.DATABASE_URL ?? ""
): DatabaseClient {
  const globals = globalThis as PoolGlobals;

  if (!globals.__shveyka_pool__ || !globals.__shveyka_pg_pool__) {
    const pool = createPool(connectionString);
    globals.__shveyka_pg_pool__ = pool;
    globals.__shveyka_pool__ = createClient(pool);
    registerShutdown();
  }

  return globals.__shveyka_pool__;
}
