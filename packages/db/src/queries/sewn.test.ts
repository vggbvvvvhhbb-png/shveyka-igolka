import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import { addSewnItem, deleteSewnItem, listSewnItems } from "./sewn";

describe("журнал сшитых вещей в pglite", () => {
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;
    await client.exec(`
      CREATE TABLE sewn_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        fabric_slug TEXT,
        cost INTEGER NOT NULL,
        market_price INTEGER,
        gift BOOLEAN NOT NULL DEFAULT FALSE,
        sewn_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });

  it("записывает вещь без даты текущим моментом", async () => {
    const item = await addSewnItem(db, {
      name: "Юбка",
      cost: 700,
      marketPrice: null,
      fabricSlug: "linen",
      gift: false,
    });

    expect(item.id.length).toBeGreaterThan(0);
    expect(item.marketPrice).toBeNull();
    expect(item.gift).toBe(false);
    expect(Math.abs(Date.now() - item.sewnAt.getTime())).toBeLessThan(60_000);
  });

  it("сохраняет признак подарка", async () => {
    const item = await addSewnItem(db, {
      name: "Плед в подарок",
      cost: 900,
      marketPrice: 3000,
      fabricSlug: null,
      gift: true,
    });

    expect(item.gift).toBe(true);
    const items = await listSewnItems(db);
    expect(items.find((i) => i.id === item.id)?.gift).toBe(true);
  });

  it("сохраняет заданную дату и отдаёт список свежими сверху", async () => {
    await addSewnItem(db, {
      name: "Старая блуза",
      cost: 400,
      marketPrice: 2000,
      fabricSlug: null,
      gift: false,
      sewnAt: new Date("2020-05-01T00:00:00Z"),
    });
    const items = await listSewnItems(db);

    expect(items[items.length - 1].name).toBe("Старая блуза");
    expect(items[items.length - 1].sewnAt.toISOString()).toBe("2020-05-01T00:00:00.000Z");
  });

  it("удаляет вещь и сообщает, если её не было", async () => {
    const item = await addSewnItem(db, {
      name: "Шарф",
      cost: 100,
      marketPrice: null,
      fabricSlug: null,
      gift: false,
    });

    expect(await deleteSewnItem(db, item.id)).toBe(true);
    expect(await deleteSewnItem(db, item.id)).toBe(false);
  });
});
