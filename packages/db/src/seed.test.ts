import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { FabricSchema, SeamSchema, ProjectSchema } from "@shveyka/core";

const DATA_DIR = resolve(import.meta.dirname, "../data");

function loadRaw(filename: string): unknown[] {
  return JSON.parse(
    readFileSync(resolve(DATA_DIR, filename), "utf-8")
  ) as unknown[];
}

describe("seed data validation", () => {
  it("validates all seams", () => {
    const raw = loadRaw("seams.json");
    const result = z.array(SeamSchema).safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(16);
    }
  });

  it("validates all fabrics", () => {
    const raw = loadRaw("fabrics.json");
    const result = z.array(FabricSchema).safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(35);
    }
  });

  it("validates all projects", () => {
    const raw = loadRaw("projects.json");
    const result = z.array(ProjectSchema).safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(6);
    }
  });
});
