import { describe, it, expect } from "vitest";
import { parseSewnCommand } from "./command";
import { buildMonthStats, buildYearStats, type SewnItem } from "./stats";
import { validateSewnInput } from "./validate";

const item = (patch: Partial<SewnItem>): SewnItem => ({
  id: "1",
  name: "Платье",
  fabricSlug: null,
  cost: 1000,
  marketPrice: null,
  gift: false,
  sewnAt: new Date("2026-03-10T12:00:00Z"),
  ...patch,
});

describe("buildYearStats", () => {
  it("пустой год — нули", () => {
    const s = buildYearStats([], 2026);
    expect(s.count).toBe(0);
    expect(s.perMonth).toHaveLength(12);
    expect(s.topFabrics).toEqual([]);
  });

  it("считает только вещи выбранного года", () => {
    const s = buildYearStats(
      [item({}), item({ id: "2", sewnAt: new Date("2025-12-31T12:00:00Z") })],
      2026
    );
    expect(s.count).toBe(1);
    expect(s.perMonth[2]).toBe(1);
  });

  it("экономия считается только по вещам с ценой в магазине", () => {
    const s = buildYearStats(
      [
        item({ cost: 1200, marketPrice: 4500 }),
        item({ id: "2", cost: 800 }),
        item({ id: "3", cost: 3000, marketPrice: 2500 }),
      ],
      2026
    );
    expect(s.totalCost).toBe(5000);
    expect(s.totalSaved).toBe(2800);
    expect(s.pricedCount).toBe(2);
  });

  it("топ тканей: по числу вещей, потом по slug", () => {
    const s = buildYearStats(
      [
        item({ fabricSlug: "linen" }),
        item({ id: "2", fabricSlug: "denim" }),
        item({ id: "3", fabricSlug: "denim" }),
        item({ id: "4", fabricSlug: "cotton" }),
        item({ id: "5", fabricSlug: "silk" }),
      ],
      2026
    );
    expect(s.topFabrics.map((f) => f.slug)).toEqual(["denim", "cotton", "linen"]);
  });

  it("подарок не попадает в экономию, но попадает в затраты", () => {
    const s = buildYearStats(
      [
        item({ cost: 1000, marketPrice: 5000 }),
        item({ id: "2", cost: 2000, marketPrice: 6000, gift: true }),
      ],
      2026
    );
    expect(s.totalCost).toBe(3000);
    expect(s.totalSaved).toBe(4000);
    expect(s.pricedCount).toBe(1);
    expect(s.giftCount).toBe(1);
    expect(s.giftSpent).toBe(2000);
  });
});

describe("buildMonthStats", () => {
  it("считает вещи только за выбранный месяц", () => {
    const s = buildMonthStats(
      [
        item({ cost: 1000, marketPrice: 4000 }),
        item({ id: "2", sewnAt: new Date("2026-04-02T12:00:00Z") }),
      ],
      2026,
      2
    );
    expect(s.count).toBe(1);
    expect(s.savedTotal).toBe(3000);
  });

  it("подарки считаются отдельно и не дают экономии", () => {
    const s = buildMonthStats(
      [
        item({ id: "1", cost: 500, marketPrice: 2000 }),
        item({ id: "2", cost: 700, marketPrice: 3000, gift: true }),
      ],
      2026,
      2
    );
    expect(s.count).toBe(2);
    expect(s.giftCount).toBe(1);
    expect(s.giftSpent).toBe(700);
    expect(s.savedTotal).toBe(1500);
  });

  it("вещь без цены в магазине экономии не даёт", () => {
    const s = buildMonthStats([item({ cost: 500, marketPrice: null })], 2026, 2);
    expect(s.savedTotal).toBe(0);
    expect(s.count).toBe(1);
  });
});

describe("validateSewnInput", () => {
  it("принимает минимальную вещь", () => {
    const r = validateSewnInput({ name: "  Юбка ", cost: 500 });
    expect(r).toEqual({
      ok: true,
      value: {
        name: "Юбка",
        cost: 500,
        marketPrice: null,
        fabricSlug: null,
        gift: false,
        sewnAt: undefined,
      },
    });
  });

  it("принимает признак подарка", () => {
    const r = validateSewnInput({ name: "Юбка", cost: 500, gift: true });
    expect(r.ok && r.value.gift).toBe(true);
  });

  it("отклоняет не-булев признак подарка", () => {
    expect(validateSewnInput({ name: "Юбка", cost: 1, gift: "да" }).ok).toBe(false);
  });

  it.each([
    [{ name: "", cost: 1 }],
    [{ name: "Юбка" }],
    [{ name: "Юбка", cost: -1 }],
    [{ name: "Юбка", cost: 1.5 }],
    [{ name: "Юбка", cost: "100" }],
    [{ name: "Юбка", cost: 1, marketPrice: -5 }],
    [{ name: "Юбка", cost: 1, fabricSlug: "Не Slug!" }],
    [{ name: "Юбка", cost: 1, sewnAt: "вчера" }],
    [{ name: "x".repeat(81), cost: 1 }],
    [null],
  ])("отклоняет %j", (body) => {
    expect(validateSewnInput(body).ok).toBe(false);
  });

  it("не принимает дату из далёкого будущего", () => {
    const now = new Date("2026-10-23T00:00:00Z");
    expect(validateSewnInput({ name: "A", cost: 1, sewnAt: "2026-12-01" }, now).ok).toBe(false);
    expect(validateSewnInput({ name: "A", cost: 1, sewnAt: "2026-10-20" }, now).ok).toBe(true);
  });
});

describe("parseSewnCommand", () => {
  it("разбирает полную команду", () => {
    const r = parseSewnCommand("Платье из льна; 1 200 ₽; 4500р; Linen");
    expect(r).toEqual({
      ok: true,
      value: {
        name: "Платье из льна",
        cost: 1200,
        marketPrice: 4500,
        fabricSlug: "linen",
        gift: false,
        sewnAt: undefined,
      },
    });
  });

  it("цена и ткань необязательны, прочерк — «нет цены»", () => {
    const r = parseSewnCommand("Шарф; 300; -");
    expect(r.ok && r.value.marketPrice).toBeNull();
  });

  it("понятные ошибки", () => {
    expect(parseSewnCommand("")).toMatchObject({ ok: false });
    expect(parseSewnCommand("Платье")).toMatchObject({ ok: false });
    expect(parseSewnCommand("Платье; много")).toMatchObject({
      ok: false,
      error: "Затраты — целое число рублей.",
    });
  });
});
