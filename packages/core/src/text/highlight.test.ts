import { describe, expect, it } from "vitest";
import { splitHighlightedText } from "./highlight";

describe("splitHighlightedText", () => {
  it("возвращает текст одним куском при пустом запросе", () => {
    expect(splitHighlightedText("Поплин хлопковый", "")).toEqual([
      { text: "Поплин хлопковый", highlighted: false },
    ]);
  });

  it("возвращает текст одним куском, если совпадений нет", () => {
    expect(splitHighlightedText("Поплин хлопковый", "шёлк")).toEqual([
      { text: "Поплин хлопковый", highlighted: false },
    ]);
  });

  it("отмечает совпадение в середине текста", () => {
    expect(splitHighlightedText("Поплин хлопковый", "хлоп")).toEqual([
      { text: "Поплин ", highlighted: false },
      { text: "хлоп", highlighted: true },
      { text: "ковый", highlighted: false },
    ]);
  });

  it("не учитывает регистр, но сохраняет исходное написание", () => {
    expect(splitHighlightedText("Поплин Хлопковый", "хлоп")).toEqual([
      { text: "Поплин ", highlighted: false },
      { text: "Хлоп", highlighted: true },
      { text: "ковый", highlighted: false },
    ]);
  });

  it("отмечает все вхождения", () => {
    expect(splitHighlightedText("хлоп и хлоп", "хлоп")).toEqual([
      { text: "хлоп", highlighted: true },
      { text: " и ", highlighted: false },
      { text: "хлоп", highlighted: true },
    ]);
  });

  it("отмечает совпадение в начале текста", () => {
    expect(splitHighlightedText("Хлопок", "хлоп")).toEqual([
      { text: "Хлоп", highlighted: true },
      { text: "ок", highlighted: false },
    ]);
  });

  it("склеивает части обратно в исходный текст", () => {
    const text = "Трикотаж кулирная гладь";
    const parts = splitHighlightedText(text, "кулир");
    expect(parts.map((p) => p.text).join("")).toBe(text);
  });

  it("пустой текст даёт один пустой кусок", () => {
    expect(splitHighlightedText("", "хлоп")).toEqual([{ text: "", highlighted: false }]);
  });
});
