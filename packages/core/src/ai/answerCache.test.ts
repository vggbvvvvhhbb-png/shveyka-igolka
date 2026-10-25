import { describe, expect, it } from "vitest";
import { cacheKey, isCacheable, normalizeQuestion, TtlLruCache, textToStream } from "./answerCache";

describe("нормализация вопроса", () => {
  it("регистр, «ё» и знаки препинания не важны", () => {
    expect(normalizeQuestion("  Какая ИГЛА для Джинсы?! ")).toBe("какая игла для джинсы");
    expect(normalizeQuestion("ёж")).toBe("еж");
  });
});

describe("ключ кэша", () => {
  it("стабилен при перестановке записей контекста", () => {
    const a = cacheKey({
      question: "Какая игла?",
      slugs: ["b", "a"],
      mode: null,
      catalogVersion: "1",
    });
    const b = cacheKey({
      question: "какая игла",
      slugs: ["a", "b"],
      mode: null,
      catalogVersion: "1",
    });
    expect(a).toBe(b);
  });

  it("меняется при новой версии каталога или новом режиме", () => {
    const base = cacheKey({
      question: "какая игла",
      slugs: ["a"],
      mode: null,
      catalogVersion: "1",
    });
    expect(
      cacheKey({ question: "какая игла", slugs: ["a"], mode: null, catalogVersion: "2" })
    ).not.toBe(base);
    expect(
      cacheKey({ question: "какая игла", slugs: ["a"], mode: "short", catalogVersion: "1" })
    ).not.toBe(base);
  });

  it("разный вопрос даёт разный ключ", () => {
    expect(
      cacheKey({ question: "какая игла", slugs: [], mode: null, catalogVersion: "1" })
    ).not.toBe(cacheKey({ question: "какой шов", slugs: [], mode: null, catalogVersion: "1" }));
  });
});

describe("isCacheable", () => {
  it("личные и диалоговые ответы не кэшируются", () => {
    expect(isCacheable({ hasHistory: false, usesMeasurements: false })).toBe(true);
    expect(isCacheable({ hasHistory: true, usesMeasurements: false })).toBe(false);
    expect(isCacheable({ hasHistory: false, usesMeasurements: true })).toBe(false);
  });
});

describe("TtlLruCache", () => {
  it("истекает по времени", () => {
    let t = 0;
    const cache = new TtlLruCache<string>(10, 100, () => t);
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
    t = 101;
    expect(cache.get("a")).toBeUndefined();
  });

  it("вытесняет наименее свежую запись", () => {
    let t = 0;
    const cache = new TtlLruCache<string>(2, 100, () => t);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a");
    cache.set("c", "3");

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.size).toBe(2);
  });
});

describe("textToStream", () => {
  it("отдаёт весь текст", async () => {
    const reader = textToStream("привет, мир".repeat(10), (x) => `data: ${x}\n\n`, 20).getReader();
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out += new TextDecoder().decode(value);
    }
    expect(out.replace(/data: |\n\n/g, "")).toBe("привет, мир".repeat(10));
  });

  it("пустой текст даёт пустой поток", async () => {
    const reader = textToStream("").getReader();
    const { done } = await reader.read();
    expect(done).toBe(true);
  });
});
