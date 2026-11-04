import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHANNEL_ID,
  DEFAULT_OWNER_ID,
  DEFAULT_SITE_URL,
  isLocalAddress,
  resolveChannelId,
  resolveOwnerIds,
  resolveSiteUrl,
} from "./settings";

describe("адрес сайта", () => {
  it("без переменной берётся боевой домен", () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
  });

  it("localhost заменяется боевым доменом", () => {
    expect(resolveSiteUrl("http://localhost:3000")).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("http://127.0.0.1:3000")).toBe(DEFAULT_SITE_URL);
  });

  it("явно пустая переменная — ссылок на сайт не будет", () => {
    expect(resolveSiteUrl("")).toBe("");
  });

  it("заданный адрес сохраняется, без слеша в конце", () => {
    expect(resolveSiteUrl("https://shveyka-igolka.ru/")).toBe("https://shveyka-igolka.ru");
  });
});

describe("канал", () => {
  it("без переменной берётся канал мастерской", () => {
    expect(resolveChannelId(undefined)).toBe(DEFAULT_CHANNEL_ID);
  });

  it("пустая переменная — тоже канал мастерской", () => {
    expect(resolveChannelId("")).toBe(DEFAULT_CHANNEL_ID);
  });

  it("заданный чат сохраняется", () => {
    expect(resolveChannelId(" -1003839377564 ")).toBe("-1003839377564");
  });
});

describe("кто публикует в канал", () => {
  it("свой список главнее", () => {
    expect(resolveOwnerIds([7], [5])).toEqual([7]);
  });

  it("без своего списка берутся те, кому открыт бот", () => {
    expect(resolveOwnerIds([], [5])).toEqual([5]);
  });

  it("без списков остаётся владелец мастерской", () => {
    expect(resolveOwnerIds([], [])).toEqual([DEFAULT_OWNER_ID]);
  });
});

describe("локальный адрес", () => {
  it("localhost и 127.0.0.1 считаются локальными", () => {
    expect(isLocalAddress("http://localhost:3000")).toBe(true);
    expect(isLocalAddress("127.0.0.1:3000")).toBe(true);
  });

  it("боевой домен локальным не считается", () => {
    expect(isLocalAddress("https://shveyka-igolka.ru")).toBe(false);
  });
});
