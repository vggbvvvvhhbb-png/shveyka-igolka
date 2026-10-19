import { describe, it, expect } from "vitest";
import { parseLinkSegments, stripUnknownLinks } from "./parseLinks";

describe("parseLinkSegments (фильтрация ссылок по разрешённым slug)", () => {
  it("Тест 1: slug из allowedSlugs → ссылка", () => {
    const allowed = new Set(["fabrics/denim"]);
    const segments = parseLinkSegments("Возьмите [Джинса](/fabrics/denim) для брюк.", allowed);
    const link = segments.find((s) => s.kind === "link");
    expect(link).toBeDefined();
    expect(link).toEqual({ kind: "link", text: "Джинса", href: "/fabrics/denim" });
  });

  it("Тест 2: slug не из allowedSlugs → только текст, не ссылка", () => {
    const allowed = new Set(["fabrics/denim"]);
    const segments = parseLinkSegments(
      "Посмотрите [Шёлк-призрак](/fabrics/silk-ghost) или [Джинса](/fabrics/denim).",
      allowed
    );
    const links = segments.filter((s) => s.kind === "link");
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe("/fabrics/denim");
    // Неизвестный slug остался текстом без скобок Markdown.
    const texts = segments.filter((s) => s.kind === "text").map((s) => s.text);
    expect(texts.join("")).toContain("Шёлк-призрак");
    expect(texts.join("")).not.toContain("silk-ghost");
  });

  it("Тест 3: пустой allowedSlugs → весь текст без ссылок", () => {
    const text =
      "См. [Джинса](/fabrics/denim), [Подгиб](/seams/hem-double-fold), [Наволочка](/projects/pillowcase-simple).";
    const segments = parseLinkSegments(text, new Set<string>());
    expect(segments.every((s) => s.kind === "text")).toBe(true);
    const joined = segments.map((s) => s.text).join("");
    expect(joined).not.toContain("/fabrics/");
    expect(joined).not.toContain("](");
    expect(joined).toContain("Джинса");
  });

  it("stripUnknownLinks сохраняет только разрешённые ссылки", () => {
    const allowed = new Set(["seams/hem-double-fold"]);
    const out = stripUnknownLinks(
      "Шов [Подгиб](/seams/hem-double-fold), ткань [Лён](/fabrics/linen).",
      allowed
    );
    expect(out).toContain("[Подгиб](/seams/hem-double-fold)");
    expect(out).not.toContain("/fabrics/linen");
    expect(out).toContain("Лён");
  });
});
