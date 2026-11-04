import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import {
  findUsers,
  recentUsage,
  recordUsage,
  usageByDay,
  usageByFeature,
  usageBySource,
  usageForUser,
  usageTopUsers,
  usageTotals,
} from "./usage";

/** Период: последние сутки от указанного момента. */
function range(now: Date) {
  return {
    from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    to: new Date(now.getTime() + 1000),
  };
}

describe("расход токенов в pglite", () => {
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;
    await client.exec(`
      CREATE TABLE ai_usage (
        id TEXT PRIMARY KEY,
        user_key TEXT NOT NULL,
        user_label TEXT,
        source TEXT NOT NULL,
        feature TEXT NOT NULL,
        mode TEXT,
        model TEXT,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        estimated BOOLEAN NOT NULL DEFAULT FALSE,
        cached BOOLEAN NOT NULL DEFAULT FALSE,
        conversation_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });

  it("сохраняет запись о расходе", async () => {
    const ok = await recordUsage(db, {
      userKey: "tg:111",
      userLabel: "Аня",
      source: "bot",
      feature: "catalog",
      mode: "short",
      model: "free/gpt-6-luna",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    expect(ok).toBe(true);

    const totals = await usageTotals(db, range(new Date()));
    expect(totals.requests).toBe(1);
    expect(totals.totalTokens).toBe(150);
    expect(totals.promptTokens).toBe(100);
    expect(totals.completionTokens).toBe(50);
  });

  it("считает расход по режимам", async () => {
    await recordUsage(db, {
      userKey: "tg:222",
      source: "bot",
      feature: "search",
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
    });

    const byFeature = await usageByFeature(db, range(new Date()));
    const search = byFeature.find((row) => row.feature === "search");
    const catalog = byFeature.find((row) => row.feature === "catalog");

    expect(search?.requests).toBe(1);
    expect(search?.totalTokens).toBe(300);
    expect(catalog?.requests).toBe(1);
  });

  it("разделяет сайт и бота", async () => {
    await recordUsage(db, {
      userKey: "web:abc",
      source: "web",
      feature: "catalog",
      totalTokens: 10,
    });

    const bySource = await usageBySource(db, range(new Date()));
    expect(bySource.find((row) => row.source === "bot")?.requests).toBe(2);
    expect(bySource.find((row) => row.source === "web")?.requests).toBe(1);
  });

  it("показывает, кто сколько потратил, с именем из последней записи", async () => {
    await recordUsage(db, {
      userKey: "tg:111",
      userLabel: "Аня",
      source: "bot",
      feature: "reason",
      totalTokens: 500,
    });

    const users = await usageTopUsers(db, range(new Date()));
    const anna = users.find((row) => row.userKey === "tg:111");

    expect(anna?.requests).toBe(2);
    expect(anna?.totalTokens).toBe(650);
    expect(anna?.userLabel).toBe("Аня");
  });

  it("отдаёт расход одного пользователя с разбивкой по функциям", async () => {
    const found = await usageForUser(db, "tg:111", range(new Date()));

    expect(found.totals.requests).toBe(2);
    expect(found.byFeature.length).toBeGreaterThan(1);
    expect(found.recent[0]?.feature).toBe("reason");
  });

  it("ищет пользователя по части ключа", async () => {
    const found = await findUsers(db, "tg:11");
    expect(found.map((row) => row.userKey)).toContain("tg:111");
  });

  it("группирует расход по дням", async () => {
    const days = await usageByDay(db, range(new Date()));
    expect(days.length).toBeGreaterThan(0);
    expect(days[0]?.requests).toBeGreaterThan(0);
  });

  it("отдаёт последние записи для выгрузки", async () => {
    const rows = await recentUsage(db, range(new Date()), 10);
    expect(rows.length).toBe(4);
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
  });
});
