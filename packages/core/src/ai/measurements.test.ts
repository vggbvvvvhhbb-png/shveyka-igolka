import { describe, it, expect } from "vitest";
import { buildSizeHint, formatMeasurements, hasMeasurements } from "./measurements";

describe("buildSizeHint", () => {
  it("для юбки считает ширину полотна по обхвату бёдер", () => {
    const hint = buildSizeHint("skirt_elastic", { hip: 98 });

    expect(hint).not.toBeNull();
    expect(hint).toContain("59 см");
  });

  it("для юбки без обхвата бёдер подсказки нет", () => {
    expect(buildSizeHint("skirt_elastic", { waist: 74 })).toBeNull();
  });

  it("для проектов без правила подсказки нет", () => {
    expect(buildSizeHint("pillowcase", { hip: 98, bust: 92 })).toBeNull();
    expect(buildSizeHint("dress_straight", { bust: 92 })).toBeNull();
  });
});

describe("formatMeasurements", () => {
  it("перечисляет только заполненные мерки", () => {
    const text = formatMeasurements({ waist: 74, height: 168 });

    expect(text).toBe("обхват талии — 74 см, рост — 168 см");
    expect(text).not.toContain("груди");
  });

  it("для пустых мерок строка пустая", () => {
    expect(formatMeasurements({})).toBe("");
  });
});

describe("hasMeasurements", () => {
  it("истина, если заполнена хотя бы одна мерка", () => {
    expect(hasMeasurements({ waist: 74 })).toBe(true);
  });

  it("ложь для пустого объекта и undefined", () => {
    expect(hasMeasurements({})).toBe(false);
    expect(hasMeasurements(undefined)).toBe(false);
  });
});
