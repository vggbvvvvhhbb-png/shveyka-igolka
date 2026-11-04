import { describe, expect, it } from "vitest";
import { addUsage, emptyUsage, estimateUsage, mergeUsage, parseProviderUsage } from "./usage";

describe("parseProviderUsage", () => {
  it("читает счётчик OpenAI-совместимого провайдера", () => {
    const usage = parseProviderUsage({
      prompt_tokens: 1200,
      completion_tokens: 340,
      total_tokens: 1540,
    });
    expect(usage).toEqual({
      promptTokens: 1200,
      completionTokens: 340,
      totalTokens: 1540,
    });
  });

  it("читает формат Anthropic", () => {
    const usage = parseProviderUsage({ input_tokens: 800, output_tokens: 200 });
    expect(usage).toEqual({
      promptTokens: 800,
      completionTokens: 200,
      totalTokens: 1000,
    });
  });

  it("считает итог, если провайдер его не прислал", () => {
    const usage = parseProviderUsage({ prompt_tokens: 100, completion_tokens: 50 });
    expect(usage?.totalTokens).toBe(150);
  });

  it("возвращает null, если счётчика нет", () => {
    expect(parseProviderUsage(undefined)).toBeNull();
    expect(parseProviderUsage({})).toBeNull();
    expect(parseProviderUsage({ prompt_tokens: 0, completion_tokens: 0 })).toBeNull();
  });

  it("не доверяет мусорным значениям", () => {
    const usage = parseProviderUsage({
      prompt_tokens: "много",
      completion_tokens: 25,
      total_tokens: -3,
    });
    expect(usage?.promptTokens).toBe(0);
    expect(usage?.completionTokens).toBe(25);
    expect(usage?.totalTokens).toBe(25);
  });
});

describe("addUsage", () => {
  it("складывает два расхода", () => {
    const total = addUsage(
      { promptTokens: 100, completionTokens: 10, totalTokens: 110 },
      { promptTokens: 50, completionTokens: 5, totalTokens: 55 }
    );
    expect(total).toEqual({ promptTokens: 150, completionTokens: 15, totalTokens: 165 });
  });

  it("пустой расход — нули", () => {
    expect(emptyUsage()).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  });
});

describe("mergeUsage", () => {
  it("берёт максимум по каждому полю", () => {
    const merged = mergeUsage(
      { promptTokens: 100, completionTokens: 0, totalTokens: 100 },
      { promptTokens: 100, completionTokens: 40, totalTokens: 140 }
    );
    expect(merged).toEqual({ promptTokens: 100, completionTokens: 40, totalTokens: 140 });
  });

  it("пустая сторона не влияет на результат", () => {
    const usage = { promptTokens: 10, completionTokens: 2, totalTokens: 12 };
    expect(mergeUsage(null, usage)).toEqual(usage);
    expect(mergeUsage(usage, null)).toEqual(usage);
    expect(mergeUsage(null, null)).toBeNull();
  });
});

describe("estimateUsage", () => {
  it("оценивает расход по длине текста", () => {
    const usage = estimateUsage("a".repeat(100), "b".repeat(50));
    expect(usage.promptTokens).toBe(40);
    expect(usage.completionTokens).toBe(20);
    expect(usage.totalTokens).toBe(60);
  });

  it("пустой текст — нулевой расход", () => {
    expect(estimateUsage("", "").totalTokens).toBe(0);
  });
});
