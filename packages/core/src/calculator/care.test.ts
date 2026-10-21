import { describe, expect, it } from "vitest";
import { generateCare, parseComposition } from "./care";

describe("parseComposition", () => {
  it("разбирает состав, где название идёт первым", () => {
    expect(parseComposition("Шерсть 80% + акрил 20%")).toEqual([
      { fiber: "wool", percent: 80 },
      { fiber: "synthetic", percent: 20 },
    ]);
  });

  it("разбирает состав, где проценты идут первыми", () => {
    expect(parseComposition("80% шерсть, 20% акрил")).toEqual([
      { fiber: "wool", percent: 80 },
      { fiber: "synthetic", percent: 20 },
    ]);
  });

  it("понимает «ё» и «е»", () => {
    expect(parseComposition("лён 100%")).toEqual([{ fiber: "linen", percent: 100 }]);
    expect(parseComposition("лен 100%")).toEqual([{ fiber: "linen", percent: 100 }]);
  });

  it("находит волокно и без процентов", () => {
    expect(parseComposition("шерстяное пальто")).toEqual([{ fiber: "wool", percent: 100 }]);
  });

  it("возвращает пустой список, если состав не распознан", () => {
    expect(parseComposition("какая-то ткань")).toEqual([]);
  });
});

describe("generateCare", () => {
  const cotton = parseComposition("хлопок 100%");
  const wool = parseComposition("шерсть 80% + акрил 20%");

  it("требует распознанный состав", () => {
    expect(() =>
      generateCare({
        fibers: [],
        density: "medium",
        pile: false,
        print: false,
        garment: "dress",
      })
    ).toThrow(/состав/);
  });

  it("для хлопка разрешает сушильную машину и сильную глажку", () => {
    const care = generateCare({
      fibers: cotton,
      density: "light",
      pile: false,
      print: false,
      garment: "dress",
    });

    expect(care.wash[0]).toContain("40°");
    expect(care.dry[0]).toContain("можно");
    expect(care.iron[0]).toContain("200°");
  });

  it("для шерсти берёт строгие правила", () => {
    const care = generateCare({
      fibers: wool,
      density: "heavy",
      pile: false,
      print: false,
      garment: "coat",
    });

    expect(care.wash[0]).toContain("30°");
    expect(care.wash.join(" ")).toContain("не выкручивать");
    expect(care.dry.join(" ")).toContain("нельзя");
    expect(care.warnings.join(" ")).toContain("сядет");
  });

  it("предупреждает, что шерсть садится при стирке в машинке", () => {
    const care = generateCare({
      fibers: wool,
      density: "medium",
      pile: false,
      print: false,
      garment: "dress",
    });

    expect(care.warnings.length).toBeGreaterThan(0);
    expect(care.warnings[0]).toContain("горячей воде");
  });

  it("запрещает отжим и сушку в машине для ворса", () => {
    const care = generateCare({
      fibers: cotton,
      density: "medium",
      pile: true,
      print: false,
      garment: "dress",
    });

    expect(care.wash.join(" ")).toContain("не выкручивать");
    expect(care.dry.join(" ")).toContain("В сушильной машине: нельзя");
  });

  it("запрещает отбеливание и солнце для принта", () => {
    const care = generateCare({
      fibers: cotton,
      density: "light",
      pile: false,
      print: true,
      garment: "dress",
    });

    expect(care.wash.join(" ")).toContain("Отбеливание: нельзя");
    expect(care.dry.join(" ")).toContain("На солнце: нельзя");
  });

  it("даёт значки для стирки, отбеливания, сушки и глажки", () => {
    const care = generateCare({
      fibers: cotton,
      density: "light",
      pile: false,
      print: false,
      garment: "dress",
    });

    const kinds = care.icons.map((i) => i.kind);
    expect(kinds).toContain("wash");
    expect(kinds).toContain("bleach");
    expect(kinds).toContain("tumble");
    expect(kinds).toContain("iron");
  });

  it("отмечает запрещённые значки", () => {
    const care = generateCare({
      fibers: cotton,
      density: "light",
      pile: false,
      print: true,
      garment: "dress",
    });

    expect(care.icons.find((i) => i.kind === "bleach")?.forbidden).toBe(true);
  });

  it("смягчает отжим и добавляет сушку расправленной для плотной ткани", () => {
    const light = generateCare({
      fibers: cotton,
      density: "light",
      pile: false,
      print: false,
      garment: "dress",
    });
    const heavy = generateCare({
      fibers: cotton,
      density: "heavy",
      pile: false,
      print: false,
      garment: "dress",
    });

    expect(light.wash.join(" ")).toContain("Отжим: можно.");
    expect(heavy.wash.join(" ")).toContain("на низких оборотах");
    expect(heavy.dry.join(" ")).toContain("растягивается");
  });

  it("готовит короткий текст для QR-кода", () => {
    const care = generateCare({
      fibers: cotton,
      density: "light",
      pile: false,
      print: false,
      garment: "dress",
    });

    expect(care.qrText.length).toBeLessThanOrEqual(400);
    expect(care.qrText).toContain("Уход");
  });

  it("пишет в названии состав волокон", () => {
    const care = generateCare({
      fibers: wool,
      density: "heavy",
      pile: false,
      print: false,
      garment: "coat",
    });

    expect(care.title).toContain("шерсть");
    expect(care.title).toContain("80%");
  });
});
