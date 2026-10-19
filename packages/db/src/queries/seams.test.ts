import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import { getSeamById, listSeamsByType, findSeamsForFabric, listSeams } from "./seams.js";

describe("seams queries", () => {
  it("exports getSeamById", () => {
    expect(typeof getSeamById).toBe("function");
  });

  it("exports listSeamsByType", () => {
    expect(typeof listSeamsByType).toBe("function");
  });

  it("exports findSeamsForFabric", () => {
    expect(typeof findSeamsForFabric).toBe("function");
  });

  it("exports listSeams", () => {
    expect(typeof listSeams).toBe("function");
  });
});

describe("listSeams with pglite", () => {
  // PGlite-клиент отличается от node-postgres по типам (другая реализация HKT),
  // хотя SQL слоя запросов выполняется одинаково — приводим тип вручную.
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;

    await client.exec(`
      CREATE TABLE seams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aliases JSONB NOT NULL DEFAULT '[]',
        type TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        suitable_weight_classes JSONB NOT NULL DEFAULT '[]',
        preferred_fabrics JSONB,
        when_to_use TEXT NOT NULL,
        default_machine_settings JSONB NOT NULL,
        steps JSONB NOT NULL DEFAULT '[]',
        common_mistakes JSONB NOT NULL DEFAULT '[]',
        variants JSONB,
        diagram_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.exec(`
      INSERT INTO seams (id, name, type, difficulty, when_to_use, default_machine_settings)
      VALUES
        ('straight-seam', 'Стачной шов (базовый)', 'join', 'beginner', 'Соединение деталей', '{}'),
        ('hem-double-fold', 'Двойной подгиб', 'hem', 'beginner', 'Низ изделия', '{}')
    `);
  });

  it("returns all seams ordered by name", async () => {
    const result = await listSeams(db);
    expect(result.map((s) => s.id)).toEqual(["hem-double-fold", "straight-seam"]);
  });
});
