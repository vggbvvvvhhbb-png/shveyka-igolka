import { describe, expect, it } from "vitest";
import { calculateCutting, describeResult, ROLL_WIDTHS, type CuttingInput } from "./cutting";

const baseInput: CuttingInput = {
  garment: "dress",
  size: 48,
  widths: [{ widthCm: 140 }],
  direction: "lengthwise",
  pattern: "none",
  seamAllowanceCm: 1.5,
  shrinkagePercent: 0,
};

describe("calculateCutting", () => {
  it("считает расход для каждой выбранной ширины рулона", () => {
    const result = calculateCutting({
      ...baseInput,
      widths: [{ widthCm: 140 }, { widthCm: 220 }],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].widthCm).toBe(140);
    expect(result.results[1].widthCm).toBe(220);
  });

  it("округляет метраж вверх до 10 см", () => {
    const result = calculateCutting(baseInput);

    for (const r of result.results) {
      expect(r.meters).toBe(Math.ceil(r.meters * 10) / 10);
      expect(r.meters).toBeGreaterThan(0);
    }
  });

  it("на широкой ткани метраж не больше, чем на узкой", () => {
    const result = calculateCutting({
      ...baseInput,
      widths: [{ widthCm: 140 }, { widthCm: 220 }],
    });

    expect(result.bestByMeters.widthCm).toBe(220);
  });

  it("добавляет метраж на усадку", () => {
    const withoutShrink = calculateCutting(baseInput);
    const withShrink = calculateCutting({
      ...baseInput,
      shrinkagePercent: 10,
    });

    expect(withShrink.bestByMeters.meters).toBeGreaterThan(withoutShrink.bestByMeters.meters);
  });

  it("считает стоимость, когда указана цена за метр", () => {
    const result = calculateCutting({
      ...baseInput,
      widths: [{ widthCm: 140, pricePerMeter: 500 }],
    });

    const r = result.results[0];
    expect(r.total).toBe(Math.round(r.meters * 500));
    expect(result.bestByCost?.widthCm).toBe(140);
  });

  it("находит выгодную ширину и считает экономию", () => {
    const result = calculateCutting({
      ...baseInput,
      widths: [
        { widthCm: 140, pricePerMeter: 900 },
        { widthCm: 220, pricePerMeter: 400 },
      ],
    });

    expect(result.bestByCost?.widthCm).toBe(220);
    expect(result.savings?.rub).toBeGreaterThan(0);
    expect(result.savings?.versusWidthCm).toBe(140);
  });

  it("не считает выгоду без цен", () => {
    const result = calculateCutting(baseInput);

    expect(result.bestByCost).toBeUndefined();
    expect(result.savings).toBeUndefined();
  });

  it("требует хотя бы одну ширину рулона", () => {
    expect(() => calculateCutting({ ...baseInput, widths: [] })).toThrow(/ширину рулона/);
  });

  it("перечисляет причины увеличения расхода в подсказках", () => {
    const result = calculateCutting({
      ...baseInput,
      pattern: "check",
      direction: "crosswise",
      shrinkagePercent: 5,
    });

    expect(result.notes.some((n) => n.includes("Клетка"))).toBe(true);
    expect(result.notes.some((n) => n.includes("поперечной"))).toBe(true);
    expect(result.notes.some((n) => n.includes("Усадка 5%"))).toBe(true);
  });

  it("описывает результат строками для показа в магазине", () => {
    const result = calculateCutting({
      ...baseInput,
      widths: [{ widthCm: 140, pricePerMeter: 500 }],
    });

    const lines = describeResult(result);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("140 см");
    expect(lines[0]).toContain("₽");
  });

  it("знает типовые ширины рулона", () => {
    expect(ROLL_WIDTHS).toContain(140);
    expect(ROLL_WIDTHS).toContain(220);
  });
});
