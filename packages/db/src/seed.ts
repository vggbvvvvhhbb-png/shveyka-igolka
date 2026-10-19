import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
dotenvConfig({ path: resolve(process.cwd(), "../../.env") });
import { readFileSync } from "node:fs";
import { z } from "zod";
import { getDbSingleton, closeDbPool } from "./client";
import { fabrics, seams, projects } from "./schema";
import { FabricSchema, SeamSchema, ProjectSchema } from "@shveyka/core";

const DATA_DIR = resolve(import.meta.dirname, "../data");

function loadJson<T>(filename: string, schema: z.ZodType<T>): T[] {
  const path = resolve(DATA_DIR, filename);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown[];

  const result = z.array(schema).safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues;
    const first = issues[0];
    let location = "unknown";
    if (first?.path.length) {
      const idx = first.path[0];
      const item = typeof idx === "number" ? raw[idx] : raw[0];
      const id =
        item && typeof item === "object" && "id" in item ? String(item.id) : `index ${String(idx)}`;
      location = `${filename} → id=${id}, field=${first.path.slice(1).join(".")}`;
    }
    throw new Error(`Validation failed: ${location}\n  expected: ${first?.message ?? "unknown"}`);
  }

  return result.data;
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const db = getDbSingleton(connectionString);

  const seamData = loadJson("seams.json", SeamSchema);
  const fabricData = loadJson("fabrics.json", FabricSchema);
  const projectData = loadJson("projects.json", ProjectSchema);

  // Insert seams first (projects reference them loosely)
  for (const item of seamData) {
    await db
      .insert(seams)
      .values(item as unknown as typeof seams.$inferInsert)
      .onConflictDoUpdate({
        target: seams.id,
        set: item as unknown as typeof seams.$inferInsert,
      });
  }

  for (const item of fabricData) {
    await db
      .insert(fabrics)
      .values(item as unknown as typeof fabrics.$inferInsert)
      .onConflictDoUpdate({
        target: fabrics.id,
        set: item as unknown as typeof fabrics.$inferInsert,
      });
  }

  for (const item of projectData) {
    await db
      .insert(projects)
      .values(item as unknown as typeof projects.$inferInsert)
      .onConflictDoUpdate({
        target: projects.id,
        set: item as unknown as typeof projects.$inferInsert,
      });
  }

  console.log(
    `✅ Seeded ${seamData.length} seams, ${fabricData.length} fabrics, ${projectData.length} projects`
  );

  // Пул держит открытые соединения, поэтому закрываем его явно —
  // иначе процесс сида не завершится.
  await closeDbPool();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
