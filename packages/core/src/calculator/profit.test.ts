import { describe, expect, it } from "vitest";
import { calcProfit, monthStats, type ProjectEntry } from "./profit";

describe("calcProfit", () => {
  it("складывает материалы, время, инструменты и электричество в себестоимость", () => {
    const r = calcProfit({
      fabric: 1000,
      lining: 200,
      hardware: 150,
      thread: 100,
      interfacing: 150,
      hours: 8,
      hourlyRate: 0,
      toolWearPerHour: 50,
      electricityPerHour: 10,
      shopPrice: 4000,
    });

    expect(r.materials).toBe(1600);
    expect(r.labor).toBe(0);
    expect(r.tools).toBe(400);
    expect(r.electricity).toBe(80);
    expect(r.cost).toBe(2080);
    expect(r.saved).toBe(1920);
    expect(r.savedPercent).toBe(48);
  });

  it("показывает отрицательную экономию, если вещь дешевле", () => {
    const r = calcProfit({
      fabric: 1000,
      lining: 0,
      hardware: 0,
      thread: 0,
      interfacing: 0,
      hours: 0,
      hourlyRate: 0,
      toolWearPerHour: 0,
      electricityPerHour: 0,
      shopPrice: 500,
    });

    expect(r.saved).toBe(-500);
    expect(r.savedPercent).toBe(-100);
  });

  it("считает, до какой цены часа шить ещё выгодно", () => {
    const r = calcProfit({
      fabric: 1000,
      lining: 0,
      hardware: 0,
      thread: 0,
      interfacing: 0,
      hours: 5,
      hourlyRate: 0,
      toolWearPerHour: 0,
      electricityPerHour: 0,
      shopPrice: 3000,
    });

    expect(r.breakEvenHourlyRate).toBe(400);
  });

  it("сравнивает с оценкой времени в 100 ₽/час", () => {
    const r = calcProfit({
      fabric: 1000,
      lining: 0,
      hardware: 0,
      thread: 0,
      interfacing: 0,
      hours: 4,
      hourlyRate: 0,
      toolWearPerHour: 0,
      electricityPerHour: 0,
      shopPrice: 2000,
    });

    expect(r.costWith100PerHour).toBe(1400);
  });
});

describe("monthStats", () => {
  const entries: ProjectEntry[] = [
    { id: 1, title: "Платье", date: "2026-10-03", gift: false, cost: 1000, shopPrice: 3000 },
    { id: 2, title: "Подарок", date: "2026-10-10", gift: true, cost: 500, shopPrice: 1500 },
    { id: 3, title: "Юбка", date: "2026-09-01", gift: false, cost: 400, shopPrice: 900 },
  ];

  it("считает вещи только за нужный месяц", () => {
    const stats = monthStats(entries, "2026-10");

    expect(stats.count).toBe(2);
    expect(stats.giftCount).toBe(1);
    expect(stats.giftSpent).toBe(500);
  });

  it("считает экономию только по вещам для себя", () => {
    const stats = monthStats(entries, "2026-10");

    expect(stats.savedTotal).toBe(2000);
  });

  it("не считает экономию, если вещь обошлась дороже магазинной", () => {
    const stats = monthStats(
      [{ id: 4, title: "Платье", date: "2026-10-03", gift: false, cost: 4000, shopPrice: 3000 }],
      "2026-10"
    );

    expect(stats.savedTotal).toBe(0);
  });

  it("пустой месяц даёт нули", () => {
    const stats = monthStats(entries, "2026-01");

    expect(stats.count).toBe(0);
    expect(stats.savedTotal).toBe(0);
  });
});
