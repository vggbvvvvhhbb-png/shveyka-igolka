import { describe, expect, it } from "vitest";
import { catalogVersionDate, computeCatalogVersion } from "./version";

describe("computeCatalogVersion", () => {
  it("берёт самую свежую дату", () => {
    expect(
      computeCatalogVersion(["2026-01-01T00:00:00Z", null, new Date("2026-03-01T00:00:00Z")])
    ).toBe(String(Date.parse("2026-03-01T00:00:00Z")));
  });

  it("пустой каталог → 0", () => {
    expect(computeCatalogVersion([])).toBe("0");
    expect(computeCatalogVersion([null, undefined, "мусор"])).toBe("0");
  });
});

describe("catalogVersionDate", () => {
  it("версия превращается в дату", () => {
    const d = catalogVersionDate(String(Date.parse("2026-03-01T00:00:00Z")));
    expect(d?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("нулевая версия → null", () => {
    expect(catalogVersionDate("0")).toBeNull();
    expect(catalogVersionDate("мусор")).toBeNull();
  });
});
