import { describe, expect, it } from "vitest";
import { CONTINUE_NOTE, looksTruncated } from "./truncation";

describe("looksTruncated", () => {
  it("по причине завершения", () => {
    expect(looksTruncated("Готово.", "length")).toBe(true);
    expect(looksTruncated("Готово.", "max_tokens")).toBe(true);
    expect(looksTruncated("Готово.", "stop")).toBe(false);
  });

  it("по оборванному на полуслове хвосту", () => {
    expect(looksTruncated("Сшейте рукав и затем при")).toBe(true);
    expect(looksTruncated("Сшейте рукав.")).toBe(false);
    expect(looksTruncated("1. Первый шаг\n2. Второй 3")).toBe(false);
    expect(looksTruncated("")).toBe(false);
  });
});

describe("CONTINUE_NOTE", () => {
  it("подсказывает, что делать дальше", () => {
    expect(CONTINUE_NOTE).toContain("продолжи");
  });
});
