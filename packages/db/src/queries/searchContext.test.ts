import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../schema";
import { searchContext, extractKeywords } from "./searchContext";
import { AssistantContextSchema } from "@shveyka/core";

describe("extractKeywords", () => {
  it("lowercases, drops short words and stop words", () => {
    const keywords = extractKeywords("Какую ткань взять для летнего платья?");
    expect(keywords).toContain("ткань");
    expect(keywords).toContain("летнего");
    expect(keywords).not.toContain("для");
    expect(keywords).not.toContain("какую");
  });

  it("adds a stem so that case forms match the nominative fabric name", () => {
    const keywords = extractKeywords("что взять для джинсы");
    expect(keywords).toContain("джинсы");
    expect(keywords).toContain("джинс");
  });

  it("returns empty array for only stop words", () => {
    expect(extractKeywords("что как для")).toEqual([]);
  });
});

describe("searchContext with pglite", () => {
  let db: any;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema });

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
        ('denim', 'Джинса', '["джинса"]', '100% хлопок', 'natural', 'heavy', 300, 450, 'none', 3, true, '["pants_simple"]', '{"needle_type":"jeans"}', '[]', 'intermediate', 'Стирка при 30°C', '["Пропуски стежков"]'),
        ('twill-cotton', 'Твил', '["сарафанный хлопок", "твил хлопковый"]', '100% хлопок', 'natural', 'medium', 150, 200, 'none', 4, true, '["dress_summer"]', '{}', '[]', 'beginner', 'Стирка при 40°C', '[]'),
        ('satin-silk', 'Атлас', '["атлас шёлковый"]', 'Шёлк 100%', 'natural', 'light', 60, 100, 'none', 5, true, '["lining"]', '{}', '[]', 'advanced', 'Ручная стирка', '[]'),
        ('crepe', 'Креп', '["креп-шифон", "креповый шифон"]', 'Полиэстер 100%', 'synthetic', 'light', 80, 120, 'medium', 3, false, '["dress_summer"]', '{}', '[]', 'advanced', 'Ручная стирка', '[]'),
        ('wool-coat', 'Костюмная шерсть', '["костюмка", "шерсть костюмная"]', 'Шерсть 80%', 'natural', 'heavy', 250, 400, 'low', 6, true, '["blazer"]', '{}', '[]', 'intermediate', 'Химчистка', '[]')
    `);

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
      INSERT INTO seams (id, name, aliases, type, difficulty, suitable_weight_classes, when_to_use, default_machine_settings, steps, common_mistakes)
      VALUES
        ('hem-double-fold', 'Двойной подгиб', '["подгиб"]', 'hem', 'beginner', '["light","medium"]', 'Низ изделия', '{"stitch_type":"straight"}', '[{"order":1,"instruction":"Подогните край"}]', '["Нет закрепки"]')
    `);

    await client.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        garment_type TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        estimated_time_hours JSONB NOT NULL,
        required_seams JSONB NOT NULL DEFAULT '[]',
        recommended_fabrics JSONB NOT NULL DEFAULT '[]',
        recommended_weight_classes JSONB NOT NULL DEFAULT '[]',
        fabric_amount_formula TEXT NOT NULL,
        seam_allowances JSONB NOT NULL,
        materials JSONB NOT NULL,
        steps JSONB NOT NULL DEFAULT '[]',
        final_checklist JSONB NOT NULL DEFAULT '[]',
        pattern_source JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.exec(`
      INSERT INTO projects (id, name, category, garment_type, difficulty, estimated_time_hours, fabric_amount_formula, seam_allowances, materials, required_seams, final_checklist)
      VALUES
        ('pillowcase-simple', 'Наволочка классическая', 'home_textile', 'pillowcase', 'beginner', '[1, 2]', 'width * 2 + 25', '{}', '{}', '["hem-double-fold"]', '["Швы ровные"]')
    `);
  });

  it("finds a fabric by name keyword", async () => {
    const ctx = await searchContext(db, "расскажи про джинса");
    expect(ctx.fabrics.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fabrics[0].slug).toBe("denim");
  });

  it("returns empty arrays for a non-existent query", async () => {
    const ctx = await searchContext(db, "несуществующаятканьxyz");
    expect(ctx.fabrics).toEqual([]);
    expect(ctx.seams).toEqual([]);
    expect(ctx.projects).toEqual([]);
  });

  it("result passes AssistantContextSchema validation", async () => {
    const ctx = await searchContext(db, "подгиб наволочка");
    expect(() => AssistantContextSchema.parse(ctx)).not.toThrow();
    expect(ctx.seams.map((s) => s.slug)).toContain("hem-double-fold");
    expect(ctx.projects.map((p) => p.slug)).toContain("pillowcase-simple");
  });

  it("задача 5: поиск по алиасу, которого нет в поле name, находит ткань", async () => {
    // «костюмка» — только в aliases wool-coat, в name его нет.
    const ctx = await searchContext(db, "что пошить из костюмки");
    expect(ctx.fabrics.map((f) => f.slug)).toContain("wool-coat");
  });

  it("задача 5: итоговый список тканей не превышает 4 записей", async () => {
    // Запрос затрагивает алиасы нескольких тканей — срез всё равно 4.
    const ctx = await searchContext(db, "атлас костюмка поплин шёлк хлопок");
    expect(ctx.fabrics.length).toBeLessThanOrEqual(4);
  });
});
