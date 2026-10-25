import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pgTable, text } from "drizzle-orm/pg-core";
import type { DatabaseClient } from "./client";
import { pruneCatalog, parseSeedArgs } from "./seedSync";

const items = pgTable("tmp_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

describe("pruneCatalog", () => {
  // PGlite-клиент отличается от node-postgres по типам (другая реализация HKT),
  // хотя SQL выполняется одинаково — приводим тип вручную, как в остальных тестах.
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client) as unknown as DatabaseClient;
    await client.exec(`
      CREATE TABLE tmp_catalog (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);
  });

  it("удаляет записи, которых больше нет в сидах", async () => {
    await db.execute(
      `INSERT INTO tmp_catalog (id, name) VALUES ('a', 'A'), ('b', 'B'), ('c', 'C')`
    );

    const reports = await pruneCatalog(db, [
      { name: "tmp", table: items, id: items.id, keep: ["a", "c"] },
    ]);

    expect(reports).toEqual([{ name: "tmp", deleted: ["b"] }]);

    const rest = await db.select({ id: items.id }).from(items);
    expect(rest.map((row) => row.id).sort()).toEqual(["a", "c"]);
  });

  it("в режиме dryRun ничего не удаляет", async () => {
    await db.execute(`INSERT INTO tmp_catalog (id, name) VALUES ('x', 'X')`);

    const reports = await pruneCatalog(
      db,
      [{ name: "tmp", table: items, id: items.id, keep: ["a", "c"] }],
      true
    );

    expect(reports).toEqual([{ name: "tmp", deleted: ["x"] }]);

    const rest = await db.select({ id: items.id }).from(items);
    expect(rest.map((row) => row.id)).toContain("x");
  });

  it("пустые сиды отменяют перезаливку с ошибкой", async () => {
    await expect(
      pruneCatalog(db, [{ name: "tmp", table: items, id: items.id, keep: [] }])
    ).rejects.toThrow(/пусты/);
  });
});

describe("parseSeedArgs", () => {
  it("без аргументов — обычный сид без перезаливки", () => {
    expect(parseSeedArgs([])).toEqual({ fresh: false, dryRun: false });
  });

  it("--fresh включает перезаливку", () => {
    expect(parseSeedArgs(["--fresh"])).toEqual({ fresh: true, dryRun: false });
  });

  it("--fresh --dry-run показывает план, но не меняет базу", () => {
    expect(parseSeedArgs(["--fresh", "--dry-run"])).toEqual({ fresh: true, dryRun: true });
  });

  it("--dry-run без --fresh игнорируется", () => {
    expect(parseSeedArgs(["--dry-run"])).toEqual({ fresh: false, dryRun: false });
  });
});
