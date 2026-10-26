import { describe, it, expect } from "vitest";
import {
  isAlreadyStored,
  LEGACY_PROJECTS_KEY,
  parseStoredProjects,
  storedProjectToSewnInput,
} from "./legacyProjects";
import { parseSewnItem, parseSewnItems } from "./item";

describe("parseStoredProjects", () => {
  it("читает сохранённую историю", () => {
    const raw = JSON.stringify([
      { id: 1, title: "Платье", date: "2026-03-10", gift: false, cost: 1200, shopPrice: 4500 },
    ]);
    expect(parseStoredProjects(raw)).toEqual([
      { id: 1, title: "Платье", date: "2026-03-10", gift: false, cost: 1200, shopPrice: 4500 },
    ]);
  });

  it("битые данные не ломают разбор", () => {
    expect(parseStoredProjects(null)).toEqual([]);
    expect(parseStoredProjects("")).toEqual([]);
    expect(parseStoredProjects("{не json")).toEqual([]);
    expect(parseStoredProjects('{"a":1}')).toEqual([]);
  });

  it("пропускает записи без названия или с ценой", () => {
    const raw = JSON.stringify([
      { title: "", cost: 100 },
      { title: "Юбка", cost: "много" },
      { title: "Юбка", cost: -5 },
      { title: "Юбка", cost: 500 },
    ]);
    expect(parseStoredProjects(raw)).toHaveLength(1);
    expect(parseStoredProjects(raw)[0].title).toBe("Юбка");
  });
});

describe("storedProjectToSewnInput", () => {
  it("переносит запись в вещь журнала", () => {
    const input = storedProjectToSewnInput({
      id: 1,
      title: "Платье",
      date: "2026-03-10",
      gift: true,
      cost: 1200,
      shopPrice: 4500,
    });
    expect(input.name).toBe("Платье");
    expect(input.cost).toBe(1200);
    expect(input.marketPrice).toBe(4500);
    expect(input.gift).toBe(true);
    expect(input.sewnAt?.toISOString().slice(0, 10)).toBe("2026-03-10");
  });

  it("без цены в магазине цена остаётся пустой", () => {
    const input = storedProjectToSewnInput({
      id: 1,
      title: "Юбка",
      date: "2026-03-10",
      gift: false,
      cost: 500,
      shopPrice: 0,
    });
    expect(input.marketPrice).toBeNull();
  });

  it("без даты дата не задаётся", () => {
    const input = storedProjectToSewnInput({
      id: 1,
      title: "Юбка",
      date: "",
      gift: false,
      cost: 500,
      shopPrice: 0,
    });
    expect(input.sewnAt).toBeUndefined();
  });
});

describe("isAlreadyStored", () => {
  const entry = {
    id: 1,
    title: "Платье",
    date: "2026-03-10",
    gift: false,
    cost: 1200,
    shopPrice: 4500,
  };

  it("находит такую же запись в журнале", () => {
    expect(
      isAlreadyStored(entry, [
        { name: "Платье", cost: 1200, marketPrice: 4500, date: "2026-03-10", gift: false },
      ])
    ).toBe(true);
  });

  it("другая дата или название — это другая запись", () => {
    expect(
      isAlreadyStored(entry, [
        { name: "Платье", cost: 1200, marketPrice: 4500, date: "2026-04-10", gift: false },
      ])
    ).toBe(false);
    expect(
      isAlreadyStored(entry, [
        { name: "Юбка", cost: 1200, marketPrice: 4500, date: "2026-03-10", gift: false },
      ])
    ).toBe(false);
  });

  it("подарок и обычная вещь — разные записи", () => {
    expect(
      isAlreadyStored({ ...entry, gift: true }, [
        { name: "Платье", cost: 1200, marketPrice: 4500, date: "2026-03-10", gift: false },
      ])
    ).toBe(false);
  });
});

describe("ключ старого хранилища", () => {
  it("совпадает с тем, что использовал калькулятор", () => {
    expect(LEGACY_PROJECTS_KEY).toBe("sewing:projects");
  });
});

describe("parseSewnItem", () => {
  it("приводит вещь из JSON к виду журнала", () => {
    const item = parseSewnItem({
      id: "abc",
      name: "Платье",
      fabricSlug: "linen",
      cost: 1200,
      marketPrice: 4500,
      gift: true,
      sewnAt: "2026-03-10T12:00:00.000Z",
    });
    expect(item).toEqual({
      id: "abc",
      name: "Платье",
      fabricSlug: "linen",
      cost: 1200,
      marketPrice: 4500,
      gift: true,
      sewnAt: new Date("2026-03-10T12:00:00.000Z"),
    });
  });

  it("пропускает записи без даты или цены", () => {
    expect(parseSewnItem({ id: "a", name: "Платье", cost: 1, sewnAt: "не дата" })).toBeNull();
    expect(parseSewnItem({ id: "a", name: "Платье", sewnAt: "2026-03-10" })).toBeNull();
    expect(parseSewnItem(null)).toBeNull();
  });

  it("список пропускает битые записи, но оставляет хорошие", () => {
    const items = parseSewnItems([
      { id: "a", name: "Платье", cost: 100, sewnAt: "2026-03-10T12:00:00.000Z" },
      { id: "b", name: "", cost: 100, sewnAt: "2026-03-10T12:00:00.000Z" },
      "мусор",
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("a");
  });
});
