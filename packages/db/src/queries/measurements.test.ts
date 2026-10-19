import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import { getMeasurements, saveMeasurements, MEASUREMENTS_ID } from "./measurements";

describe("мерки в pglite", () => {
  // PGlite-клиент отличается от node-postgres по типам (другая реализация HKT),
  // хотя SQL слоя запросов выполняется одинаково — приводим тип вручную.
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;

    await client.exec(`
      CREATE TABLE measurements (
        id TEXT PRIMARY KEY,
        bust INTEGER,
        waist INTEGER,
        hip INTEGER,
        height INTEGER,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  });

  it("до сохранения мерок нет", async () => {
    expect(await getMeasurements(db)).toBeUndefined();
  });

  it("сохраняет мерки и читает их обратно", async () => {
    const saved = await saveMeasurements(db, { bust: 92, waist: 74, hip: 98, height: 168 });

    expect(saved.id).toBe(MEASUREMENTS_ID);
    expect(saved.bust).toBe(92);
    expect(saved.waist).toBe(74);
    expect(saved.hip).toBe(98);
    expect(saved.height).toBe(168);

    const loaded = await getMeasurements(db);
    expect(loaded?.bust).toBe(92);
  });

  it("обновляет запись, а не создаёт вторую", async () => {
    await saveMeasurements(db, { bust: 92, waist: 74 });
    const updated = await saveMeasurements(db, { bust: 94 });

    expect(updated.bust).toBe(94);
    expect(updated.waist).toBeNull();
    expect((await getMeasurements(db))?.bust).toBe(94);
  });

  it("незаполненные мерки хранятся как null", async () => {
    const saved = await saveMeasurements(db, { waist: 70 });

    expect(saved.waist).toBe(70);
    expect(saved.bust).toBeNull();
    expect(saved.hip).toBeNull();
    expect(saved.height).toBeNull();
  });
});
