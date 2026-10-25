import { describe, expect, it } from "vitest";
import { buildFallbackBlock, suggestNearest, SOFT_REFUSAL_RULE, type PoolEntry } from "./fallback";

describe("suggestNearest", () => {
  const pool: PoolEntry[] = [
    { kind: "fabric", slug: "denim", name: "Джинсовая ткань", aliases: ["деним"] },
    { kind: "fabric", slug: "linen", name: "Лён" },
    { kind: "seam", slug: "plain", name: "Стачной шов" },
  ];

  it("находит ближайшее по основе слова", () => {
    expect(suggestNearest("как шить джинсу", pool).map((e) => e.slug)).toEqual(["denim"]);
  });

  it("пустой вопрос и незнакомые слова не дают подсказок", () => {
    expect(suggestNearest("", pool)).toEqual([]);
    expect(suggestNearest("космос", pool)).toEqual([]);
  });

  it("подсказок не больше лимита", () => {
    expect(suggestNearest("джинса лён шов", pool, 2)).toHaveLength(2);
  });
});

describe("buildFallbackBlock", () => {
  it("пустой блок без вариантов", () => {
    expect(buildFallbackBlock([])).toBe("");
  });

  it("в блоке есть название и slug записи", () => {
    const block = buildFallbackBlock([{ kind: "fabric", slug: "denim", name: "Джинсовая ткань" }]);
    expect(block).toContain("Джинсовая ткань");
    expect(block).toContain("slug: denim");
  });
});

describe("SOFT_REFUSAL_RULE", () => {
  it("правило просит уточнить, а не просто отказать", () => {
    expect(SOFT_REFUSAL_RULE).toContain("уточняющий вопрос");
    expect(SOFT_REFUSAL_RULE).not.toContain("В каталоге Швейки этого нет");
  });
});
