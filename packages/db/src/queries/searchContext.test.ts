import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import { searchContext, extractKeywords } from "./searchContext";
import { AssistantContextSchema } from "@shveyka/core";

describe("extractKeywords", () => {
  it("lowercases, drops short words and stop words", () => {
    const keywords = extractKeywords("Какую ткань взять для летнего платья?");
    expect(keywords).toContain("летнего");
    expect(keywords).not.toContain("для");
    expect(keywords).not.toContain("какую");
  });

  it("убирает общие слова, которые ничего не различают в каталоге", () => {
    // «Ткань» совпадало с названиями «Костюмная стрейч-ткань» и «Подкладочная
    // ткань»: в контекст попадали ткани, о которых не спрашивали.
    const keywords = extractKeywords("Какую ткань взять для летнего платья?");
    expect(keywords).not.toContain("ткань");
    expect(keywords).not.toContain("ткан");
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
  // PGlite-клиент отличается от node-postgres по типам (другая реализация HKT),
  // хотя SQL слоя запросов выполняется одинаково — приводим тип вручную.
  let db: DatabaseClient;
  let client: PGlite;

  beforeAll(async () => {
    client = new PGlite();
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
        ('denim', 'Джинса', '["джинса"]', '100% хлопок', 'natural', 'heavy', 300, 450, 'none', 3, true, '["pants_simple"]', '{"needle_type":"jeans"}', '[]', 'intermediate', 'Стирка при 30°C', '["Пропуски стежков"]'),
        ('twill-cotton', 'Твил', '["сарафанный хлопок", "твил хлопковый"]', '100% хлопок', 'natural', 'medium', 150, 200, 'none', 4, true, '["dress_summer"]', '{}', '[]', 'beginner', 'Стирка при 40°C', '[]'),
        ('satin-silk', 'Атлас', '["атлас шёлковый"]', 'Шёлк 100%', 'natural', 'light', 60, 100, 'none', 5, true, '["lining"]', '{}', '[]', 'advanced', 'Ручная стирка', '[]'),
        ('crepe', 'Креп', '["креп-шифон", "креповый шифон"]', 'Полиэстер 100%', 'synthetic', 'light', 80, 120, 'medium', 3, false, '["dress_summer"]', '{}', '[]', 'advanced', 'Ручная стирка', '[]'),
        ('wool-coat', 'Костюмная шерсть', '["костюмка", "шерсть костюмная"]', 'Шерсть 80%', 'natural', 'heavy', 250, 400, 'low', 6, true, '["blazer"]', '{}', '[]', 'intermediate', 'Химчистка', '[]'),
        ('cotton-jersey', 'Хлопок трикотажный', '["хлопок"]', 'Хлопок 95%, эластан 5%', 'blend', 'medium', 130, 180, 'high', 3, true, '["dress_summer"]', '{}', '[]', 'beginner', 'Стирка при 30°C', '[]'),
        ('suiting-stretch', 'Костюмная стрейч-ткань', '["костюмная стрейч"]', 'Полиэстер 95%, эластан 5%', 'blend', 'medium', 180, 220, 'low', 3, true, '["pants_simple"]', '{}', '[]', 'intermediate', 'Стирка при 40°C, быстрая сушка', '[]')
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

    // Шов с «ё» в алиасе: пользователь пишет «обметканная» вместо «обмётанная».
    await client.exec(`
      INSERT INTO seams (id, name, aliases, type, difficulty, suitable_weight_classes, when_to_use, default_machine_settings, steps, common_mistakes)
      VALUES ('buttonhole-zigzag', 'Петля в рамку зигзагом', '["обмётанная петля", "петля"]', 'buttonhole', 'intermediate', '["light","medium"]', 'Застёжка', '{"stitch_type":"zigzag"}', '[]', '[]')
    `);

    // Девять швов с «отрезок» в алиасах — проверяем срез выдачи в 8 записей.
    const manySeams = Array.from({ length: 9 }, (_, i) => {
      const id = `cut-edge-${i + 1}`;
      return `('${id}', 'Отрезка ${i + 1}', '["отрезок"]', 'edge_finish', 'beginner', '["light"]', 'Край изделия', '{"stitch_type":"straight"}', '[]', '[]')`;
    });

    await client.exec(
      `INSERT INTO seams (id, name, aliases, type, difficulty, suitable_weight_classes, when_to_use, default_machine_settings, steps, common_mistakes) VALUES ${manySeams.join(", ")}`
    );

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

    // Девять проектов с «подушка» в названии — проверяем срез выдачи в 8 записей.
    const manyProjects = Array.from({ length: 9 }, (_, i) => {
      const id = `pillowcase-variant-${i + 1}`;
      return `('${id}', 'Подушка вариант ${i + 1}', 'home_textile', 'pillowcase', 'beginner', '[1, 2]', 'width * 2 + 25', '{}', '{}', '[]', '[]')`;
    });

    await client.exec(
      `INSERT INTO projects (id, name, category, garment_type, difficulty, estimated_time_hours, fabric_amount_formula, seam_allowances, materials, required_seams, final_checklist) VALUES ${manyProjects.join(", ")}`
    );

    // Юбка на резинке: у этого проекта в шагах есть правило вывода ширины
    // полотна из обхвата бёдер — по нему считается подсказка по размеру.
    await client.exec(`
      INSERT INTO projects (id, name, category, garment_type, difficulty, estimated_time_hours, fabric_amount_formula, seam_allowances, materials, required_seams, final_checklist)
      VALUES ('skirt-elastic-waist', 'Юбка на резинке', 'clothing', 'skirt_elastic', 'beginner', '[2, 4]', 'length + 15', '{}', '{}', '["straight-seam"]', '["Швы ровные"]')
    `);

    // Название начинается со «шт…» — запрос «шить» не должен его находить.
    await client.exec(`
      INSERT INTO projects (id, name, category, garment_type, difficulty, estimated_time_hours, fabric_amount_formula, seam_allowances, materials, required_seams, final_checklist)
      VALUES ('curtains-loop', 'Шторы на шторной ленте', 'home_textile', 'curtains', 'beginner', '[2, 4]', 'width * 2', '{}', '{}', '[]', '["Швы ровные"]')
    `);

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

  it("дедуплицирует ткань, найденную сразу по нескольким словам", async () => {
    // «Атлас» совпадает и по названию, и по алиасу «атлас шёлковый».
    const ctx = await searchContext(db, "атлас шёлковый атлас");
    expect(ctx.fabrics.filter((f) => f.slug === "satin-silk")).toHaveLength(1);
  });

  it("приоритет: совпадение по названию раньше совпадения по алиасу", async () => {
    // «Хлопок трикотажный» совпадает по названию, «Твил» — только по алиасу
    // «сарафанный хлопок», «Джинса» — только по составу.
    const ctx = await searchContext(db, "хлопок");
    const slugs = ctx.fabrics.map((f) => f.slug);
    expect(slugs[0]).toBe("cotton-jersey");
    expect(slugs.indexOf("cotton-jersey")).toBeLessThan(slugs.indexOf("twill-cotton"));
    expect(slugs.indexOf("twill-cotton")).toBeLessThan(slugs.indexOf("denim"));
  });

  it("итоговый список швов не превышает 8 записей", async () => {
    const ctx = await searchContext(db, "отрезок");
    expect(ctx.seams.length).toBe(8);
  });

  it("итоговый список проектов не превышает 8 записей", async () => {
    const ctx = await searchContext(db, "подушка");
    expect(ctx.projects.length).toBe(8);
  });

  it("без мерок в контексте нет блока measurements", async () => {
    const ctx = await searchContext(db, "юбка на резинке");

    expect(ctx.measurements).toBeUndefined();
    expect(ctx.projects.find((p) => p.slug === "skirt-elastic-waist")?.size_hint).toBeUndefined();
  });

  it("мерки попадают в контекст и в подсказку по размеру", async () => {
    await client.exec(`
      INSERT INTO measurements (id, bust, waist, hip, height)
      VALUES ('default', 92, 74, 98, 168)
    `);

    const ctx = await searchContext(db, "юбка на резинке");

    expect(ctx.measurements).toEqual({ bust: 92, waist: 74, hip: 98, height: 168 });
    const skirt = ctx.projects.find((p) => p.slug === "skirt-elastic-waist");
    expect(skirt?.size_hint).toContain("59 см");
  });

  it("у проектов без правила подсказки по размеру нет", async () => {
    const ctx = await searchContext(db, "наволочка");

    expect(ctx.measurements).toBeDefined();
    expect(ctx.projects.find((p) => p.slug === "pillowcase-simple")?.size_hint).toBeUndefined();
  });

  it("мерки возвращаются даже когда в вопросе нет ключевых слов", async () => {
    // «ткань» — общее слово, оно отбрасывается: вопрос остаётся без ключевых
    // слов, и ответ считается по меркам владельца.
    const ctx = await searchContext(db, "ткань");

    expect(ctx.fabrics).toEqual([]);
    expect(ctx.measurements).toEqual({ bust: 92, waist: 74, hip: 98, height: 168 });
  });

  it("мерки не попадают в контекст постороннего посетителя", async () => {
    const ctx = await searchContext(db, "юбка на резинке", { withMeasurements: false });

    expect(ctx.measurements).toBeUndefined();
    expect(ctx.projects.find((p) => p.slug === "skirt-elastic-waist")?.size_hint).toBeUndefined();
  });

  it("находит шов, если в запросе «е» вместо «ё»", async () => {
    // В алиасе записано «обмётанная петля», пользователь пишет «обметканная».
    const ctx = await searchContext(db, "обметканная петля");
    expect(ctx.seams.map((s) => s.slug)).toContain("buttonhole-zigzag");
  });

  it("находит ткань, если в запросе «е» вместо «ё»", async () => {
    // В каталоге записано «атлас шёлковый», пользователь пишет «шелковый».
    const ctx = await searchContext(db, "атлас шелковый");
    expect(ctx.fabrics.map((f) => f.slug)).toContain("satin-silk");
  });

  it("не путает «шить» с «шторы»", async () => {
    // «шить» и «шторы» различаются одной буквой, но это разные слова.
    const ctx = await searchContext(db, "как шить");
    expect(ctx.projects.map((p) => p.slug)).not.toContain("curtains-loop");
  });

  it("общее слово «ткань» не тянет в контекст ткани из-за названия", async () => {
    // «Костюмная стрейч-ткань» совпадала с запросом только по слову «ткань».
    const ctx = await searchContext(db, "какую ткань взять для платья");
    expect(ctx.fabrics.map((f) => f.slug)).not.toContain("suiting-stretch");
  });
});
