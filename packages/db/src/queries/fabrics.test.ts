import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import { searchFabrics, countFabrics, getFabricBySlug } from "./fabrics";

describe("fabrics queries with pglite", () => {
  // PGlite-клиент отличается от node-postgres по типам (другая реализация HKT),
  // хотя SQL слоя запросов выполняется одинаково — приводим тип вручную.
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;

    // Create fabrics table using raw SQL (same as schema, but without indexes that may not matter)
    await client.exec(`
      CREATE TABLE fabrics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aliases JSONB NOT NULL DEFAULT '[]',
        composition TEXT NOT NULL,
        category TEXT NOT NULL,
        weight_class TEXT NOT NULL,
        density_min_gsm INTEGER NOT NULL,
        density_max_gsm INTEGER NOT NULL,
        stretch TEXT NOT NULL,
        shrinkage_percent INTEGER NOT NULL,
        requires_decatizing BOOLEAN NOT NULL,
        suitable_for JSONB NOT NULL DEFAULT '[]',
        default_machine_settings JSONB NOT NULL DEFAULT '{}',
        recommended_edge_finish JSONB NOT NULL DEFAULT '[]',
        difficulty_to_work_with TEXT NOT NULL,
        care_instructions TEXT NOT NULL,
        common_issues JSONB NOT NULL DEFAULT '[]',
        photo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const values = [
      `('cotton-poplin', 'Поплин хлопковый', '["поплин"]', '100% хлопок', 'natural', 'medium', 110, 130, 'low', 5, true, '[]', '{}', '[]', 'beginner', 'Стирка при 40°C', '[]')`,
      `('batiste', 'Батист', '["батист"]', '100% хлопок', 'natural', 'light', 70, 100, 'none', 4, true, '[]', '{}', '[]', 'intermediate', 'Деликатная стирка', '[]')`,
      `('denim', 'Джинса', '["джинса"]', '100% хлопок', 'natural', 'heavy', 300, 450, 'none', 3, true, '[]', '{}', '[]', 'intermediate', 'Стирка при 30°C', '[]')`,
      `('chiffon', 'Шифон', '["шифон"]', '100% полиэстер', 'synthetic', 'light', 30, 50, 'none', 0, false, '[]', '{}', '[]', 'advanced', 'Ручная стирка', '[]')`,
      `('jersey-single', 'Трикотаж кулирная гладь', '["кулирка"]', 'Хлопок 92% / эластан 8%', 'blend', 'medium', 140, 180, 'high', 3, true, '[]', '{}', '[]', 'intermediate', 'Стирка при 30°C', '[]')`,
    ];

    await client.exec(
      `INSERT INTO fabrics (id, name, aliases, composition, category, weight_class, density_min_gsm, density_max_gsm, stretch, shrinkage_percent, requires_decatizing, suitable_for, default_machine_settings, recommended_edge_finish, difficulty_to_work_with, care_instructions, common_issues) VALUES ${values.join(", ")}`
    );
  });

  it("getFabricBySlug returns fabric when slug exists", async () => {
    const fabric = await getFabricBySlug(db, "denim");
    expect(fabric).not.toBeNull();
    expect(fabric?.name).toBe("Джинса");
    expect(fabric?.category).toBe("natural");
  });

  it("getFabricBySlug returns null for non-existent slug", async () => {
    const fabric = await getFabricBySlug(db, "nonexistent");
    expect(fabric).toBeNull();
  });

  it("searchFabrics without filters returns all fabrics", async () => {
    const result = await searchFabrics(db);
    expect(result.length).toBe(5);
  });

  it("searchFabrics filters by category", async () => {
    const result = await searchFabrics(db, { category: "synthetic" });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Шифон");
  });

  it("countFabrics without filters returns total count", async () => {
    const result = await countFabrics(db);
    expect(result).toBe(5);
  });

  it("countFabrics with category filter returns correct count", async () => {
    const result = await countFabrics(db, { category: "natural" });
    expect(result).toBe(3);
  });

  it("searchFabrics filters by weight", async () => {
    const result = await searchFabrics(db, { weight: "light" });
    expect(result.length).toBe(2);
    const names = result.map((r) => r.name).sort();
    expect(names).toEqual(["Батист", "Шифон"]);
  });

  it("searchFabrics filters by stretch", async () => {
    const result = await searchFabrics(db, { stretch: "high" });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Трикотаж кулирная гладь");
  });

  it("searchFabrics filters by q (ilike on name)", async () => {
    const result = await searchFabrics(db, { q: "хлоп" });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Поплин хлопковый");
  });

  it("searchFabrics with combined filters", async () => {
    const result = await searchFabrics(db, {
      category: "natural",
      weight: "heavy",
    });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Джинса");
  });
});
