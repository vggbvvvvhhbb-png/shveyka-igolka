import { describe, expect, it } from "vitest";
import { isOwner, OWNER_COOKIE, readCookie, safeEqual } from "./ownerKey";

describe("safeEqual", () => {
  it("одинаковые строки равны, разные — нет", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
    expect(safeEqual("", "a")).toBe(false);
  });
});

describe("readCookie", () => {
  it("находит значение по имени", () => {
    expect(readCookie("a=1; b=%D0%B0", "b")).toBe("а");
    expect(readCookie("shveyka_owner=key", OWNER_COOKIE)).toBe("key");
    expect(readCookie("x=1", "y")).toBe("");
  });

  it("пустая или битая строка — cookie нет", () => {
    expect(readCookie(null, "a")).toBe("");
    expect(readCookie(undefined, "a")).toBe("");
    expect(readCookie("a=%E0%A4%A", "a")).toBe("");
  });
});

describe("isOwner", () => {
  it("ключ не задан — владелец любой", () => {
    expect(isOwner(null, undefined)).toBe(true);
    expect(isOwner(null, "")).toBe(true);
  });

  it("ключ задан — нужен подходящий cookie", () => {
    expect(isOwner(null, "k")).toBe(false);
    expect(isOwner(`${OWNER_COOKIE}=k`, "k")).toBe(true);
    expect(isOwner(`${OWNER_COOKIE}=x`, "k")).toBe(false);
  });

  it("cookie другого имени не подходит", () => {
    expect(isOwner("other=k", "k")).toBe(false);
  });
});
