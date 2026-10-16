import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../schema";
import {
  getProjectById,
  listProjectsByDifficulty,
  getProjectWithResolvedRefs,
  listProjects,
} from "./projects.js";

describe("projects queries", () => {
  it("exports listProjects", () => {
    expect(typeof listProjects).toBe("function");
  });

  it("exports getProjectById", () => {
    expect(typeof getProjectById).toBe("function");
  });

  it("exports listProjectsByDifficulty", () => {
    expect(typeof listProjectsByDifficulty).toBe("function");
  });

  it("exports getProjectWithResolvedRefs", () => {
    expect(typeof getProjectWithResolvedRefs).toBe("function");
  });
});

describe("listProjects with pglite", () => {
  let db: any;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema });

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
      INSERT INTO projects (id, name, category, garment_type, difficulty, estimated_time_hours, fabric_amount_formula, seam_allowances, materials)
      VALUES
        ('skirt-elastic-waist', 'Юбка на резинке', 'clothing', 'skirt_elastic', 'beginner', '[2, 4]', 'length + 15', '{}', '{}'),
        ('pillowcase-simple', 'Наволочка классическая', 'home_textile', 'pillowcase', 'beginner', '[1, 2]', 'width * 2 + 25', '{}', '{}')
    `);
  });

  it("returns all projects ordered by name", async () => {
    const result = await listProjects(db);
    expect(result.map((p) => p.id)).toEqual(["pillowcase-simple", "skirt-elastic-waist"]);
  });
});
