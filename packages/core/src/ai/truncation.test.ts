import { describe, expect, it } from "vitest";
import { CONTINUE_NOTE, looksTruncated } from "./truncation";

describe("looksTruncated", () => {
  it("по причине завершения", () => {
    expect(looksTruncated("Готово.", "length")).toBe(true);
    expect(looksTruncated("Готово.", "max_tokens")).toBe(true);
    expect(looksTruncated("Готово.", "stop")).toBe(false);
  });

  it("причина завершения важнее вида конца текста", () => {
    // Провайдер сказал, что ответ дописан: значит, он не оборван, даже если
    // последнее слово не заканчивается точкой.
    expect(looksTruncated("- Рост — 168 см", "stop")).toBe(false);
    expect(looksTruncated("Сшейте рукав и затем при", "stop")).toBe(false);
  });

  it("по оборванному на полуслове хвосту", () => {
    expect(looksTruncated("Сшейте рукав и затем при")).toBe(true);
    expect(looksTruncated("Сшейте рукав.")).toBe(false);
    expect(looksTruncated("1. Первый шаг\n2. Второй 3")).toBe(false);
    expect(looksTruncated("")).toBe(false);
  });

  it("ответ, заканчивающийся числом с единицей измерения, не обрыв", () => {
    // «Рост — 168 см» — законченный ответ: точки в конце нет, но и полуслова
    // нет. Раньше такой ответ считался оборванным.
    expect(looksTruncated("- Рост — 168 см")).toBe(false);
    expect(looksTruncated("Отрезать 120 см")).toBe(false);
    expect(looksTruncated("Взять 3 шт")).toBe(false);
  });
});

describe("CONTINUE_NOTE", () => {
  it("подсказывает, что делать дальше", () => {
    expect(CONTINUE_NOTE).toContain("продолжи");
  });
});
