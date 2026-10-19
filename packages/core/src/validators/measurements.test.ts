import { describe, it, expect } from "vitest";
import { MeasurementsSchema } from "./measurements";

describe("MeasurementsSchema", () => {
  it("принимает граничные значения 30 и 250", () => {
    const result = MeasurementsSchema.safeParse({ bust: 30, waist: 250 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bust).toBe(30);
      expect(result.data.waist).toBe(250);
    }
  });

  it("отклоняет 29 и 251", () => {
    expect(MeasurementsSchema.safeParse({ bust: 29 }).success).toBe(false);
    expect(MeasurementsSchema.safeParse({ bust: 251 }).success).toBe(false);
  });

  it("отклоняет дробные значения", () => {
    expect(MeasurementsSchema.safeParse({ waist: 74.5 }).success).toBe(false);
  });

  it("отклоняет не-числа", () => {
    expect(MeasurementsSchema.safeParse({ hip: "98" }).success).toBe(false);
  });

  it("все поля опциональны", () => {
    const result = MeasurementsSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("ошибка объясняет диапазон по-русски", () => {
    const result = MeasurementsSchema.safeParse({ bust: 10 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("30");
    }
  });
});
