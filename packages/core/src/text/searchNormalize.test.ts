import { describe, expect, it } from "vitest";
import { matchesSearchTerm, normalizeSearchText, searchSkeleton } from "./searchNormalize";

describe("normalizeSearchText", () => {
  it("приводит текст к нижнему регистру", () => {
    expect(normalizeSearchText("ЛЁН")).toBe("лен");
  });

  it("заменяет «ё» на «е»", () => {
    expect(normalizeSearchText("Тёплый")).toBe("теплый");
  });

  it("заменяет «ъ» на «ь»", () => {
    expect(normalizeSearchText("Съёмка")).toBe("сьемка");
  });

  it("схлопывает лишние пробелы и обрезает края", () => {
    expect(normalizeSearchText("  Поплин   хлопковый  ")).toBe("поплин хлопковый");
  });

  it("пустая строка остаётся пустой", () => {
    expect(normalizeSearchText("   ")).toBe("");
  });
});

describe("searchSkeleton", () => {
  it("оставляет только согласные", () => {
    expect(searchSkeleton("Поплин")).toBe("пплн");
  });

  it("убирает мягкий знак", () => {
    expect(searchSkeleton("Льня")).toBe("лн");
  });

  it("даёт один скелет для падежных форм льна", () => {
    const forms = ["лён", "лень", "льня", "льна", "льну", "лна"];
    const skeletons = new Set(forms.map(searchSkeleton));
    expect(skeletons.size).toBe(1);
    expect([...skeletons][0]).toBe("лн");
  });

  it("пустое слово даёт пустой скелет", () => {
    expect(searchSkeleton("ая")).toBe("");
  });
});

describe("matchesSearchTerm", () => {
  it("находит слово по точному совпадению", () => {
    expect(matchesSearchTerm("Поплин хлопковый", "хлоп")).toBe(true);
  });

  it("находит слово, если запрос короче текста", () => {
    expect(matchesSearchTerm("Поплин хлопковый", "поплин")).toBe(true);
  });

  it("не находит несовпадающие слова", () => {
    expect(matchesSearchTerm("Поплин хлопковый", "шёлк")).toBe(false);
  });

  it("нечувствителен к регистру", () => {
    expect(matchesSearchTerm("Поплин хлопковый", "ПОПЛИН")).toBe(true);
  });

  it("считает «ё» и «е» одним и тем же", () => {
    expect(matchesSearchTerm("Лён", "лен")).toBe(true);
    expect(matchesSearchTerm("Тёплый трикотаж", "теплый")).toBe(true);
  });

  it("находит падежные формы: «лень» находит «Лён»", () => {
    expect(matchesSearchTerm("Лён", "лень")).toBe(true);
  });

  it("находит падежные формы: «льня» находит «Лён»", () => {
    expect(matchesSearchTerm("Лён", "льня")).toBe(true);
  });

  it("находит падежные формы: «льна» находит «Лён»", () => {
    expect(matchesSearchTerm("Лён", "льна")).toBe(true);
  });

  it("находит падежные формы по алиасу", () => {
    expect(matchesSearchTerm("лён, linen", "льня")).toBe(true);
  });

  it("не путает слова с разными согласными", () => {
    expect(matchesSearchTerm("Лён", "длинный")).toBe(false);
  });

  it("короткий запрос не сравнивается по скелету", () => {
    // «ок» в скелете — одна буква, она совпала бы с любой тканью.
    expect(matchesSearchTerm("Лён", "ок")).toBe(false);
  });

  it("пустая строка не совпадает ни с чем", () => {
    expect(matchesSearchTerm("Лён", "")).toBe(false);
    expect(matchesSearchTerm("", "лён")).toBe(false);
  });

  it("слово из одних гласных не даёт ложных совпадений", () => {
    expect(matchesSearchTerm("Лён", "ая")).toBe(false);
  });
});
