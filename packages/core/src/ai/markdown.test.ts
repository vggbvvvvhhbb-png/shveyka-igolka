import { describe, expect, it } from "vitest";

import { catalogSlugOf, isSafeLinkHref, parseInline, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("разбирает заголовки, абзацы и списки", () => {
    const blocks = parseMarkdown(
      ["## Короткий вывод", "", "Берите лён.", "", "- Пункт один", "- Пункт два"].join("\n")
    );

    expect(blocks).toEqual([
      { kind: "heading", level: 2, text: "Короткий вывод" },
      { kind: "paragraph", text: "Берите лён." },
      { kind: "list", ordered: false, items: ["Пункт один", "Пункт два"] },
    ]);
  });

  it("разбирает нумерованный список", () => {
    const blocks = parseMarkdown(["1. Первый шаг", "2. Второй шаг"].join("\n"));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ kind: "list", ordered: true, items: ["Первый шаг", "Второй шаг"] });
  });

  it("строка с числом и точкой не становится пунктом списка", () => {
    const blocks = parseMarkdown("1.5 метра ткани");

    expect(blocks).toEqual([{ kind: "paragraph", text: "1.5 метра ткани" }]);
  });

  it("разбирает цитату и линию", () => {
    const blocks = parseMarkdown(["> Цитата", "---", "После"].join("\n"));

    expect(blocks).toEqual([
      { kind: "quote", text: "Цитата" },
      { kind: "rule" },
      { kind: "paragraph", text: "После" },
    ]);
  });

  it("склеивает строки абзаца в один", () => {
    const blocks = parseMarkdown("Первая строка\nвторая строка");

    expect(blocks).toEqual([{ kind: "paragraph", text: "Первая строка вторая строка" }]);
  });

  it("пустой текст не даёт блоков", () => {
    expect(parseMarkdown("   \n  ")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("разбирает выделение, курсив и код", () => {
    const parts = parseInline("**жирный**, *курсив*, `код`");

    expect(parts).toEqual([
      { kind: "bold", text: "жирный" },
      { kind: "text", text: ", " },
      { kind: "italic", text: "курсив" },
      { kind: "text", text: ", " },
      { kind: "code", text: "код" },
    ]);
  });

  it("разбирает ссылку", () => {
    const parts = parseInline("см. [джинсовая ткань](/fabrics/denim)");

    expect(parts[1]).toEqual({ kind: "link", text: "джинсовая ткань", href: "/fabrics/denim" });
  });

  it("разбирает ссылку на источник как ссылку на источник, а не как ссылку", () => {
    const parts = parseInline("по данным [1] и [2]");

    expect(parts.filter((part) => part.kind === "citation")).toEqual([
      { kind: "citation", index: 1 },
      { kind: "citation", index: 2 },
    ]);
  });

  it("обычный текст остаётся текстом", () => {
    expect(parseInline("просто текст")).toEqual([{ kind: "text", text: "просто текст" }]);
  });
});

describe("isSafeLinkHref", () => {
  it("разрешает адреса интернета и внутренние страницы", () => {
    expect(isSafeLinkHref("https://example.com/page")).toBe(true);
    expect(isSafeLinkHref("http://example.com")).toBe(true);
    expect(isSafeLinkHref("/fabrics/denim")).toBe(true);
  });

  it("отклоняет опасные и внешние адреса", () => {
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
    expect(isSafeLinkHref("data:text/html,<b>x</b>")).toBe(false);
    expect(isSafeLinkHref("//example.com")).toBe(false);
    expect(isSafeLinkHref("")).toBe(false);
  });
});

describe("catalogSlugOf", () => {
  it("узнаёт ссылку на запись каталога", () => {
    expect(catalogSlugOf("/fabrics/denim")).toBe("fabrics/denim");
    expect(catalogSlugOf("/seams/flat-felled-seam")).toBe("seams/flat-felled-seam");
  });

  it("другие адреса записью каталога не считает", () => {
    expect(catalogSlugOf("/projects/dress")).toBe("projects/dress");
    expect(catalogSlugOf("https://example.com")).toBeNull();
    expect(catalogSlugOf("/other/page")).toBeNull();
  });
});
