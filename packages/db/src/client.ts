import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DatabaseClient = ReturnType<typeof createDbClient>;

/**
 * Creates a typed Drizzle ORM client backed by a pg Pool.
 */
export function createDbClient(connectionString: string) {
  const isDev = process.env.NODE_ENV !== "production";
  const pool = new Pool({
    connectionString,
    max: 5,
    min: isDev ? 2 : 2,
    idleTimeoutMillis: isDev ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  // Graceful shutdown to avoid leaking connections during dev HMR
  const onSigterm = () => {
    console.log("[db] Received SIGTERM, ending pool…");
    pool.end().catch(() => {});
  };
  process.on("SIGTERM", onSigterm);

  return db;
}

/**
 * Singleton pattern for Next.js hot reload in development.
 * In production, always returns a fresh instance.
 */
export function getDbSingleton(
  connectionString: string = process.env.DATABASE_URL ?? ""
): DatabaseClient {
  if (process.env.NODE_ENV === "production") {
    return createDbClient(connectionString);
  }

  const globalWithPool = globalThis as typeof globalThis & {
    __shveyka_pool__?: DatabaseClient;
  };

  if (!globalWithPool.__shveyka_pool__) {
    globalWithPool.__shveyka_pool__ = createDbClient(connectionString);
  }

  return globalWithPool.__shveyka_pool__;
}
