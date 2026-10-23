import { describe, it, expect } from "vitest";
import {
  estimateMeters,
  rankFabricsForProject,
  scoreFabricForProject,
  type FabricTraits,
  type ProjectNeeds,
} from "./projectFabric";

const project: ProjectNeeds = {
  difficulty: "intermediate",
  recommended_fabrics: ["linen", "cotton"],
  recommended_weight_classes: ["light", "medium"],
  required_seams: ["french-seam", "overlock"],
};

const fabric = (patch: Partial<FabricTraits>): FabricTraits => ({
  id: "linen",
  name: "Лён",
  weight_class: "medium",
  shrinkage_percent: 3,
  requires_decatizing: false,
  difficulty_to_work_with: "beginner",
  recommended_edge_finish: ["french-seam", "overlock"],
  ...patch,
});

describe("scoreFabricForProject", () => {
  it("идеальная ткань получает 100 и вердикт «подходит»", () => {
    const r = scoreFabricForProject(project, fabric({}));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe("fits");
    expect(r.warnings).toEqual([]);
  });

  it("соседний класс веса даёт частичные баллы и предупреждение", () => {
    const r = scoreFabricForProject(project, fabric({ weight_class: "heavy" }));
    expect(r.score).toBe(80);
    expect(r.warnings.some((w) => w.includes("рядом"))).toBe(true);
  });

  it("далёкий вес и чужая ткань — «не подходит»", () => {
    const r = scoreFabricForProject(
      project,
      fabric({ id: "leather", weight_class: "very_heavy", recommended_edge_finish: [] })
    );
    expect(r.verdict).toBe("poor");
  });

  it("декатировка и большая усадка снимают баллы за усадку", () => {
    const r = scoreFabricForProject(
      project,
      fabric({ shrinkage_percent: 8, requires_decatizing: true })
    );
    expect(r.score).toBe(95);
    expect(r.warnings[0]).toContain("декатировка");
  });

  it("сложная ткань для простого проекта — предупреждение", () => {
    const r = scoreFabricForProject(project, fabric({ difficulty_to_work_with: "advanced" }));
    expect(r.score).toBe(90);
    expect(r.warnings.some((w) => w.includes("сложнее"))).toBe(true);
  });

  it("считает долю подходящих швов", () => {
    const r = scoreFabricForProject(project, fabric({ recommended_edge_finish: ["overlock"] }));
    expect(r.score).toBe(93);
  });

  it("проект без обязательных швов не штрафует ткань", () => {
    const r = scoreFabricForProject({ ...project, required_seams: [] }, fabric({}));
    expect(r.score).toBe(100);
  });
});

describe("rankFabricsForProject", () => {
  it("сортирует по убыванию оценки, потом по названию", () => {
    const ranked = rankFabricsForProject(project, [
      fabric({ id: "b", name: "Б", weight_class: "heavy" }),
      fabric({ id: "linen", name: "Лён" }),
      fabric({ id: "a", name: "А", weight_class: "heavy" }),
    ]);
    expect(ranked.map((r) => r.fabricId)).toEqual(["linen", "a", "b"]);
  });
});

describe("estimateMeters", () => {
  it("округляет вверх до 10 см", () => {
    expect(estimateMeters({ baseMeters: 2, widthCm: 150, shrinkagePercent: 3 })).toBe(2.1);
  });

  it("не прибавляет лишнего, когда пересчёт точный", () => {
    expect(estimateMeters({ baseMeters: 2, widthCm: 150, shrinkagePercent: 0 })).toBe(2);
  });

  it("узкий рулон требует больше ткани, широкий — меньше", () => {
    expect(estimateMeters({ baseMeters: 3, widthCm: 140, shrinkagePercent: 0 })).toBe(3.3);
    expect(estimateMeters({ baseMeters: 3, widthCm: 220, shrinkagePercent: 0 })).toBe(2.1);
  });

  it("отклоняет некорректные числа", () => {
    expect(() => estimateMeters({ baseMeters: 0, widthCm: 150, shrinkagePercent: 0 })).toThrow(
      RangeError
    );
    expect(() => estimateMeters({ baseMeters: 2, widthCm: 150, shrinkagePercent: -1 })).toThrow(
      RangeError
    );
  });
});
