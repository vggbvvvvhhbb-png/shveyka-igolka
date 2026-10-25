import { describe, expect, it } from "vitest";
import { buildCatalogGraph, toFabricNode, toProjectNode, toSeamNode } from "./links";

const graph = buildCatalogGraph({
  fabrics: [
    toFabricNode({
      id: "f1",
      slug: "linen",
      name: "Лён",
      recommended_edge_finish: ["s1", "zigzag-seam", "ghost"],
    }),
    toFabricNode({ id: "f2", slug: "denim", name: "Джинса", recommendedEdgeFinish: ["s1"] }),
  ],
  seams: [
    toSeamNode({ id: "s1", slug: "plain", name: "Стачной" }),
    toSeamNode({ id: "s2", slug: "zigzag-seam", name: "Зигзаг", preferred_fabrics: ["f2", "f1"] }),
  ],
  projects: [
    toProjectNode({
      id: "p1",
      slug: "apron",
      name: "Фартук",
      garment_type: "apron",
      required_seams: ["s1"],
      recommended_fabrics: ["linen"],
    }),
  ],
});

describe("buildCatalogGraph", () => {
  it("ткань → швы по id и slug, битые ссылки пропускаются", () => {
    expect(graph.fabric("linen").seams.map((s) => s.slug)).toEqual(["plain", "zigzag-seam"]);
  });

  it("ткань → проекты по recommended_fabrics", () => {
    expect(graph.fabric("linen").projects[0].href).toBe("/projects/apron");
    expect(graph.fabric("denim").projects).toEqual([]);
  });

  it("шов → ткани: прямые + инверсия без дублей", () => {
    expect(graph.seam("plain").fabrics.map((f) => f.slug)).toEqual(["linen", "denim"]);
    expect(graph.seam("zigzag-seam").fabrics.map((f) => f.slug)).toEqual(["denim", "linen"]);
  });

  it("шов → проекты по required_seams", () => {
    expect(graph.seam("plain").projects.map((p) => p.slug)).toEqual(["apron"]);
  });

  it("проект → швы и ткани; неизвестный slug → пусто", () => {
    expect(graph.project("apron").seams.map((s) => s.slug)).toEqual(["plain"]);
    expect(graph.project("apron").fabrics.map((f) => f.slug)).toEqual(["linen"]);
    expect(graph.project("nope")).toEqual({ seams: [], fabrics: [] });
  });

  it("неизвестная ткань и шов дают пустые связи", () => {
    expect(graph.fabric("nope")).toEqual({ seams: [], projects: [] });
    expect(graph.seam("nope")).toEqual({ fabrics: [], projects: [] });
  });
});
