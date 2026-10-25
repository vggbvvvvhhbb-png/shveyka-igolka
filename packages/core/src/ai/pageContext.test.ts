import { describe, expect, it } from "vitest";
import { ctxFromPath, mergeContext, parsePageRef, ROUTE_SEGMENT } from "./pageContext";

describe("parsePageRef", () => {
  it("разбирает только валидные ссылки", () => {
    expect(parsePageRef("fabric/cotton-poplin")).toEqual({
      kind: "fabric",
      slug: "cotton-poplin",
    });

    for (const bad of [
      "fabric/",
      "x/y",
      "../etc",
      "fabric/A B",
      "fabric/a/b",
      42,
      null,
      undefined,
    ]) {
      expect(parsePageRef(bad)).toBeNull();
    }
  });
});

describe("mergeContext", () => {
  it("закреплённая запись первая, без дублей, поиск не вытеснен", () => {
    const merged = mergeContext({ slug: "b" }, [{ slug: "a" }, { slug: "b" }, { slug: "c" }], 3);
    expect(merged.map((x) => x.slug)).toEqual(["b", "a", "c"]);
  });

  it("без закреплённой записи поиск не меняется", () => {
    expect(mergeContext(null, [{ slug: "a" }], 3)).toEqual([{ slug: "a" }]);
  });

  it("лимит всегда хотя бы одна запись", () => {
    expect(mergeContext(null, [{ slug: "a" }, { slug: "b" }], 0)).toHaveLength(1);
  });
});

describe("ctxFromPath", () => {
  it("страницы каталога → ctx, остальное → undefined", () => {
    expect(ctxFromPath("/fabrics/cotton-poplin")).toBe("fabric/cotton-poplin");
    expect(ctxFromPath("/projects/apron/")).toBe("project/apron");
    expect(ctxFromPath("/seams/hem-double-fold")).toBe("seam/hem-double-fold");
    expect(ctxFromPath("/fabrics")).toBeUndefined();
    expect(ctxFromPath("/fabrics/a/match")).toBeUndefined();
    expect(ctxFromPath("/fabrics/Bad Slug")).toBeUndefined();
    expect(ctxFromPath("/assistant")).toBeUndefined();
  });
});

describe("ROUTE_SEGMENT", () => {
  it("вид записи переводится в сегмент маршрута", () => {
    expect(ROUTE_SEGMENT.fabric).toBe("fabrics");
    expect(ROUTE_SEGMENT.seam).toBe("seams");
    expect(ROUTE_SEGMENT.project).toBe("projects");
  });
});
