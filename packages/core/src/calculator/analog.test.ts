import { describe, expect, it } from "vitest";
import { FABRIC_OPTIONS } from "./fabrics";
import { findAnalogs, findFabricByName } from "./analog";

describe("findFabricByName", () => {
  it("находит ткань по названию", () => {
    expect(findFabricByName("лён")?.id).toBe("linen");
  });

  it("находит ткань по синониму", () => {
    expect(findFabricByName("джинса")?.id).toBe("denim");
  });

  it("приводит «ё» к «е», чтобы находить «лен» и «лён»", () => {
    expect(findFabricByName("лен")?.id).toBe("linen");
  });

  it("не находит ткань по слишком короткому запросу", () => {
    expect(findFabricByName("л")).toBeUndefined();
  });

  it("возвращает undefined, если такой ткани нет", () => {
    expect(findFabricByName("несуществующая ткань")).toBeUndefined();
  });
});

describe("findAnalogs", () => {
  it("находит исходную ткань в базе", () => {
    const res = findAnalogs({ name: "драп" });

    expect(res.original?.id).toBe("drap");
  });

  it("не выдаёт исходную ткань среди аналогов", () => {
    const res = findAnalogs({ name: "драп" });

    expect(res.analogs.some((a) => a.fabric.id === "drap")).toBe(false);
  });

  it("оставляет только ткани дешевле исходной", () => {
    const res = findAnalogs({ name: "драп", onlyCheaper: true });

    expect(res.analogs.length).toBeGreaterThan(0);
    for (const a of res.analogs) {
      expect(a.fabric.price).toBeLessThan(res.original!.price);
    }
  });

  it("считает экономию за метр и в процентах", () => {
    const res = findAnalogs({ name: "шёлк", onlyCheaper: true });
    const first = res.analogs[0];

    expect(first.savingsPerMeter).toBe(res.original!.price - first.fabric.price);
    expect(first.savingsPercent).toBeGreaterThan(0);
  });

  it("учитывает обязательные свойства", () => {
    const res = findAnalogs({
      name: "хлопок",
      traits: ["no-wrinkle"],
      onlyCheaper: false,
    });

    for (const a of res.analogs) {
      expect(a.fabric.traits).toContain("no-wrinkle");
    }
  });

  it("предупреждает о тонкой ткани для пальто", () => {
    const res = findAnalogs({ purpose: "coat", density: "light" });

    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain("пальто");
  });

  it("принимает свою базу тканей", () => {
    const catalog = FABRIC_OPTIONS.slice(0, 2);
    const res = findAnalogs({ onlyCheaper: false }, catalog);

    expect(res.analogs.every((a) => catalog.some((f) => f.id === a.fabric.id))).toBe(true);
  });
});
