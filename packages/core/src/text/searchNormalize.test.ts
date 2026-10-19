import { describe, expect, it } from "vitest";
import {
  matchesSearchTerm,
  matchesWordTerm,
  normalizeSearchText,
  searchSkeleton,
  splitWords,
} from "./searchNormalize";

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

  it("не путает «шить» с «шторы»", () => {
    // Скелеты разные («шт» и «штры»), но короткий скелет запроса
    // не должен совпадать с началом длинного слова.
    expect(matchesSearchTerm("Шторы на шторной ленте", "шить")).toBe(false);
  });

  it("находит слово по падежной форме в любом слове фразы", () => {
    expect(matchesSearchTerm("Трикотаж кулирная гладь", "гладь")).toBe(true);
  });

  it("находит длинную форму запроса по короткому слову", () => {
    expect(matchesSearchTerm("Хлопок", "хлопковая")).toBe(true);
  });

  it("не находит слово по первой букве", () => {
    expect(matchesSearchTerm("Лён", "ли")).toBe(false);
  });

  it("не ищет короткое название внутри длинного слова", () => {
    // «лен» прячется в «расправленном», но «Лён» к нему отношения не имеет.
    expect(matchesSearchTerm("Лён", "расправленном")).toBe(false);
  });
});

describe("splitWords", () => {
  it("делит текст по пробелам и знакам препинания", () => {
    expect(splitWords("Поплин хлопковый, сатин")).toEqual(["поплин", "хлопковый", "сатин"]);
  });

  it("приводит слова к нижнему регистру и без «ё»", () => {
    expect(splitWords("ЛЁН и Шёлк")).toEqual(["лен", "и", "шелк"]);
  });

  it("пустой текст даёт пустой список", () => {
    expect(splitWords("   ")).toEqual([]);
  });
});

describe("matchesWordTerm", () => {
  it("находит слово целиком", () => {
    expect(matchesWordTerm("100% лен", "лен")).toBe(true);
  });

  it("не находит слово внутри другого слова", () => {
    // Подстрока «лен» прячется в «расправленном», «медленно», «усиленных».
    expect(matchesWordTerm("Сушить в расправленном виде", "лен")).toBe(false);
    expect(matchesWordTerm("Шить медленно и ровно", "лен")).toBe(false);
    expect(matchesWordTerm("Используйте усиленные нитки", "лен")).toBe(false);
  });

  it("находит слово в начале и в конце фразы", () => {
    expect(matchesWordTerm("Лен и хлопок", "лен")).toBe(true);
    expect(matchesWordTerm("Хлопок и лен", "лен")).toBe(true);
  });

  it("нечувствителен к регистру и к «ё»", () => {
    expect(matchesWordTerm("Стёжка на швейной машине", "стежка")).toBe(true);
  });

  it("пустая строка не совпадает ни с чем", () => {
    expect(matchesWordTerm("Лён", "")).toBe(false);
    expect(matchesWordTerm("", "лён")).toBe(false);
  });
});
