import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import {
  searchFabrics,
  countFabrics,
  getFabricBySlug,
  searchFabricsByKeywords,
  searchFabricsByQuery,
} from "./fabrics";

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

  it("searchFabrics filters by q (совпадение по названию и по составу)", async () => {
    const result = await searchFabrics(db, { q: "хлоп" });
    expect(result.length).toBe(4);
    expect(result[0].name).toBe("Поплин хлопковый");
  });

  it("находит ткань, у которой искомое слово есть только в составе", async () => {
    const result = await searchFabrics(db, { q: "хлопок" });
    expect(result.map((r) => r.id)).toContain("batiste");
  });

  it("находит ткань по алиасу, которого нет в названии", async () => {
    const result = await searchFabrics(db, { q: "кулирка" });
    expect(result.map((r) => r.id)).toEqual(["jersey-single"]);
  });

  it("приоритет отдаёт совпадение по названию раньше совпадения по составу", async () => {
    const result = await searchFabrics(db, { q: "хлоп" });
    expect(result[0].id).toBe("cotton-poplin");
    expect(result.map((r) => r.id)).not.toContain("chiffon");
  });

  it("пустой q не ограничивает выдачу", async () => {
    const result = await searchFabrics(db, { q: "   " });
    expect(result.length).toBe(5);
  });

  it("спецсимволы % и _ не работают как wildcards", async () => {
    expect(await searchFabrics(db, { q: "хлоп%" })).toHaveLength(0);
    expect(await searchFabrics(db, { q: "хлоп_" })).toHaveLength(0);
  });

  it("countFabrics совпадает с длиной выдачи searchFabrics", async () => {
    const filters = { q: "хлоп" };
    const [list, total] = await Promise.all([
      searchFabrics(db, filters),
      countFabrics(db, filters),
    ]);
    expect(total).toBe(list.length);
  });

  it("searchFabricsByQuery ищет по всем полям сразу", async () => {
    const result = await searchFabricsByQuery(db, "кулирка");
    expect(result.map((r) => r.id)).toEqual(["jersey-single"]);
  });

  it("searchFabricsByKeywords принимает несколько слов и не дублирует записи", async () => {
    const result = await searchFabricsByKeywords(db, ["хлоп", "батист"]);
    expect(result.length).toBe(4);
    expect(new Set(result.map((r) => r.id)).size).toBe(4);
    // Совпадения по названию идут раньше совпадений только по составу.
    expect(
      result
        .slice(0, 2)
        .map((r) => r.id)
        .sort()
    ).toEqual(["batiste", "cotton-poplin"]);
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

describe("поиск тканей с «ё» и «е»", () => {
  // Каталог пишет «Лён», «Шёлк», а пользователь ищет «лень», «шелк».
  // Без нормализации запись не находится вовсе.
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;

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

    await client.exec(`
      INSERT INTO fabrics (id, name, aliases, composition, category, weight_class, density_min_gsm, density_max_gsm, stretch, shrinkage_percent, requires_decatizing, suitable_for, default_machine_settings, recommended_edge_finish, difficulty_to_work_with, care_instructions, common_issues)
      VALUES
        ('linen-natural', 'Лён', '["лён", "linen"]', '100% лён', 'natural', 'medium', 150, 200, 'none', 7, true, '[]', '{}', '[]', 'intermediate', 'Стирка при 40°C', '[]'),
        ('silk-natural', 'Шёлк натуральный', '["шёлк", "silk"]', '100% шёлк', 'natural', 'light', 60, 100, 'none', 5, true, '[]', '{}', '[]', 'advanced', 'Ручная стирка', '[]'),
        ('quilted-fabric', 'Стёжка', '["стёжка", "quilted fabric"]', '100% хлопок', 'natural', 'medium', 180, 240, 'none', 3, true, '[]', '{}', '[]', 'intermediate', 'Стирка при 40°C', '[]')
    `);
  });

  it("находит «Лён» по запросу «лень»", async () => {
    const result = await searchFabrics(db, { q: "лень" });
    expect(result.map((r) => r.id)).toEqual(["linen-natural"]);
  });

  it("находит «Лён» по запросу «льня»", async () => {
    const result = await searchFabrics(db, { q: "льня" });
    expect(result.map((r) => r.id)).toEqual(["linen-natural"]);
  });

  it("находит «Лён» по запросу «льна»", async () => {
    const result = await searchFabrics(db, { q: "льна" });
    expect(result.map((r) => r.id)).toEqual(["linen-natural"]);
  });

  it("находит «Лён» по запросу «лен»", async () => {
    const result = await searchFabrics(db, { q: "лен" });
    expect(result[0].id).toBe("linen-natural");
  });

  it("находит «Шёлк» по запросу «шелк»", async () => {
    const result = await searchFabrics(db, { q: "шелк" });
    expect(result.map((r) => r.id)).toEqual(["silk-natural"]);
  });

  it("находит «Стёжка» по запросу «стежка»", async () => {
    const result = await searchFabrics(db, { q: "стежка" });
    expect(result.map((r) => r.id)).toEqual(["quilted-fabric"]);
  });

  it("не путает «Лён» с похожим по гласным словом", async () => {
    const result = await searchFabrics(db, { q: "длинный" });
    expect(result.map((r) => r.id)).not.toContain("linen-natural");
  });

  it("searchFabricsByKeywords находит «Лён» по слову «льна»", async () => {
    const result = await searchFabricsByKeywords(db, ["льна"]);
    expect(result.map((r) => r.id)).toContain("linen-natural");
  });

  it("совпадение по названию идёт раньше совпадения по составу", async () => {
    const result = await searchFabrics(db, { q: "шелк" });
    expect(result[0].id).toBe("silk-natural");
  });
});
