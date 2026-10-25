import { describe, expect, it } from "vitest";
import { buildCatalogGraph, toFabricNode, toProjectNode, toSeamNode } from "../catalog/links";
import { recommendStart } from "./recommend";

const g = buildCatalogGraph({
  fabrics: ["a", "b", "c"].map((s) =>
    toFabricNode({ id: s, slug: s, name: s.toUpperCase(), recommended_edge_finish: ["s1"] })
  ),
  seams: [toSeamNode({ id: "s1", slug: "s1", name: "Шов" })],
  projects: [
    toProjectNode({
      id: "p1",
      slug: "p1",
      name: "Юбка",
      garment_type: "skirt",
      required_seams: ["s1"],
      recommended_fabrics: ["a", "b", "c"],
    }),
    toProjectNode({
      id: "p2",
      slug: "p2",
      name: "Фартук",
      garment_type: "apron",
      required_seams: [],
      recommended_fabrics: ["c"],
    }),
  ],
});

describe("recommendStart", () => {
  it("изделие + ткань → ткань выбранная первой, тканей не больше двух", () => {
    const r = recommendStart(g, { garment: "skirt", fabric: "b" });

    expect(r.fabrics.map((f) => f.slug)).toEqual(["b", "a"]);
    expect(r.project?.href).toBe("/projects/p1");
    expect(r.seam?.slug).toBe("s1");
  });

  it("проект под выбранную ткань важнее просто подходящего по изделию", () => {
    expect(recommendStart(g, { fabric: "c" }).project?.slug).toBe("p1");
    expect(recommendStart(g, { garment: "apron" }).project?.slug).toBe("p2");
  });

  it("неизвестное изделие → без проекта, а не случайный", () => {
    const r = recommendStart(g, { garment: "ghost" });

    expect(r.project).toBeNull();
    expect(r.fabrics).toEqual([]);
  });

  it("выбранная ткань без проекта всё равно попадает в ответ", () => {
    const r = recommendStart(g, { garment: "ghost", fabric: "a" });

    expect(r.project).toBeNull();
    expect(r.fabrics.map((f) => f.slug)).toEqual(["a"]);
  });

  it("заметка про машину только когда машина другая", () => {
    expect(recommendStart(g, { ownMachine: false }).machineNote).toContain("Brother LS-200s");
    expect(recommendStart(g, { ownMachine: true }).machineNote).toBeNull();
    expect(recommendStart(g, {}).machineNote).toBeNull();
  });

  it("без ответов проект не подставляется", () => {
    const r = recommendStart(g, {});

    expect(r.project).toBeNull();
    expect(r.seam).toBeNull();
  });
});
