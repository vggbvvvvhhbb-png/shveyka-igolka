import { describe, expect, it } from "vitest";
import {
  buildContextSlugsHeader,
  flattenContext,
  groupContext,
  measurementsOf,
} from "./contextEntries";
import type { AssistantContext } from "./contextSchema";

const FABRIC = {
  slug: "denim",
  name: "Джинса",
  aliases: ["джинса"],
  category: "natural",
  weight_class: "heavy",
  stretch: "none",
  suitable_for: [],
  default_machine_settings: {},
  care_instructions: "",
  common_issues: [],
};

const SEAM = {
  slug: "plain-seam",
  name: "Стачной шов",
  aliases: [],
  type: "join",
  difficulty: "beginner",
  suitable_weight_classes: [],
  when_to_use: "",
  default_machine_settings: {},
  steps: [],
  common_mistakes: [],
};

const PROJECT = {
  slug: "apron",
  name: "Фартук",
  category: "clothing",
  garment_type: "apron",
  difficulty: "beginner",
  estimated_time_hours: [1, 2] as [number, number],
  fabric_amount_formula: "",
  required_seams: [],
  final_checklist: [],
};

const context: AssistantContext = {
  fabrics: [FABRIC, { ...FABRIC, slug: "linen", name: "Лён" }],
  seams: [SEAM],
  projects: [PROJECT],
};

describe("flattenContext", () => {
  it("виды записей перемежаются, а не идут блоками", () => {
    const flat = flattenContext(context);
    expect(flat.map((e) => `${e.kind}/${e.slug}`)).toEqual([
      "fabric/denim",
      "seam/plain-seam",
      "project/apron",
      "fabric/linen",
    ]);
  });

  it("пустой контекст даёт пустой список", () => {
    expect(flattenContext({ fabrics: [], seams: [], projects: [] })).toEqual([]);
  });
});

describe("groupContext", () => {
  it("обратная сборка сохраняет записи по видам", () => {
    const roundTrip = groupContext(flattenContext(context));
    expect(roundTrip.fabrics.map((f) => f.slug)).toEqual(["denim", "linen"]);
    expect(roundTrip.seams.map((s) => s.slug)).toEqual(["plain-seam"]);
    expect(roundTrip.projects.map((p) => p.slug)).toEqual(["apron"]);
  });

  it("мерки возвращаются в контекст отдельным аргументом", () => {
    // Мерок нет среди записей каталога: без отдельного аргумента они бы
    // потерялись, и промт остался бы без размеров пользователя.
    const roundTrip = groupContext(flattenContext(context), { bust: 92, waist: 74 });

    expect(roundTrip.measurements).toEqual({ bust: 92, waist: 74 });
  });

  it("пустые мерки в контекст не попадают", () => {
    const roundTrip = groupContext(flattenContext(context), {});

    expect(roundTrip.measurements).toBeUndefined();
  });
});

describe("measurementsOf", () => {
  it("достаёт мерки из сгруппированного контекста", () => {
    expect(measurementsOf({ ...context, measurements: { hip: 98 } })).toEqual({ hip: 98 });
  });

  it("без мерок возвращает undefined", () => {
    expect(measurementsOf(context)).toBeUndefined();
    expect(measurementsOf({ ...context, measurements: {} })).toBeUndefined();
  });
});

describe("buildContextSlugsHeader", () => {
  it("собирает «тип/slug» через запятую", () => {
    const header = buildContextSlugsHeader(flattenContext(context));
    expect(header).toBe("fabrics/denim,seams/plain-seam,projects/apron,fabrics/linen");
  });

  it("обрезает до предельной длины", () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      kind: "fabric" as const,
      slug: `fabric-${i}`,
      name: `Ткань ${i}`,
      data: FABRIC,
    }));
    const header = buildContextSlugsHeader(many, 2000);
    expect(header.length).toBeLessThanOrEqual(2000);
    expect(header.split(",").length).toBeGreaterThan(100);
  });
});
