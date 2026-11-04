import { describe, expect, it } from "vitest";
import { decodeUserName, encodeUserName } from "./userName";

describe("имя пользователя в заголовке", () => {
  it("кириллица кодируется и декодируется без потерь", () => {
    const name = "Аня";
    expect(decodeUserName(encodeUserName(name))).toBe(name);
  });

  it("в закодированном виде значение содержит только латиницу", () => {
    expect(encodeUserName("Аня Иванова")).toMatch(/^[\x20-\x7e]+$/);
  });

  it("имя без кириллицы тоже проходит через кодирование", () => {
    expect(decodeUserName(encodeUserName("Anne"))).toBe("Anne");
  });

  it("пустое имя остаётся пустым", () => {
    expect(decodeUserName("   ")).toBeNull();
  });

  it("битое значение не теряется, а возвращается как есть", () => {
    expect(decodeUserName("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
