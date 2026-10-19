import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { poolInstances } = vi.hoisted(() => ({
  poolInstances: [] as unknown[],
}));

vi.mock("pg", () => {
  class Pool {
    options: unknown;
    end = vi.fn(async () => {});
    on = vi.fn();
    constructor(options: unknown) {
      this.options = options;
      poolInstances.push(this);
    }
  }
  return { Pool };
});

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: vi.fn((pool: unknown) => ({ __pool: pool })),
}));

import { getDbSingleton, closeDbPool } from "./client";

type PoolGlobals = typeof globalThis & {
  __shveyka_pool__?: unknown;
  __shveyka_pg_pool__?: unknown;
  __shveyka_shutdown__?: { handler: () => void };
};

describe("клиент БД: кеш пула и обработчик SIGTERM", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const globals = globalThis as PoolGlobals;

  beforeEach(() => {
    poolInstances.length = 0;
    delete globals.__shveyka_pool__;
    delete globals.__shveyka_pg_pool__;
    delete globals.__shveyka_shutdown__;
  });

  afterEach(async () => {
    await closeDbPool();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("возвращает один и тот же клиент в production", () => {
    process.env.NODE_ENV = "production";

    const first = getDbSingleton("postgres://test");
    const second = getDbSingleton("postgres://test");

    expect(second).toBe(first);
  });

  it("создаёт пул только один раз при повторных вызовах", () => {
    process.env.NODE_ENV = "production";

    getDbSingleton("postgres://test");
    getDbSingleton("postgres://test");
    getDbSingleton("postgres://test");

    expect(poolInstances).toHaveLength(1);
  });

  it("не добавляет слушателей SIGTERM при повторных вызовах", () => {
    const before = process.listenerCount("SIGTERM");

    for (let i = 0; i < 5; i += 1) {
      getDbSingleton("postgres://test");
    }

    expect(process.listenerCount("SIGTERM")).toBe(before + 1);
  });

  it("снимает слушатель SIGTERM при закрытии пула", async () => {
    const before = process.listenerCount("SIGTERM");

    getDbSingleton("postgres://test");
    expect(process.listenerCount("SIGTERM")).toBe(before + 1);

    await closeDbPool();

    expect(process.listenerCount("SIGTERM")).toBe(before);
  });

  it("после закрытия создаёт новый пул", async () => {
    getDbSingleton("postgres://test");
    await closeDbPool();

    getDbSingleton("postgres://test");

    expect(poolInstances).toHaveLength(2);
  });
});
