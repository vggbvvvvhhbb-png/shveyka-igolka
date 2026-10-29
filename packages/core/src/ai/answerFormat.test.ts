import { describe, expect, it } from "vitest";

import { countCitations, extractFollowUps, normalizeAnswer, parseAnswer } from "./answerFormat";

describe("normalizeAnswer", () => {
  it("убирает пробел перед знаком препинания", () => {
    expect(normalizeAnswer("не перегревают ребёнка .")).toBe("не перегревают ребёнка.");
  });

  it("убирает пробел перед запятой и двоеточием", () => {
    expect(normalizeAnswer("муслин , батист")).toBe("муслин, батист");
    expect(normalizeAnswer("плотность : 60–100 г/м²")).toBe("плотность: 60–100 г/м²");
  });

  it("схлопывает лишние пробелы и висящие пробелы в конце строки", () => {
    expect(normalizeAnswer("две  пробела   тут")).toBe("две пробела тут");
    expect(normalizeAnswer("строка с хвостом   \nвторая")).toBe("строка с хвостом\nвторая");
  });

  it("оставляет не больше одной пустой строки между абзацами", () => {
    expect(normalizeAnswer("первый\n\n\n\nвторой")).toBe("первый\n\nвторой");
  });

  it("не трогает разметку и ссылки", () => {
    const text = "**жирный** и [1] — источник";
    expect(normalizeAnswer(text)).toBe(text);
  });

  it("не ломает десятичные числа", () => {
    expect(normalizeAnswer("1.5 метра")).toBe("1.5 метра");
  });
});

describe("extractFollowUps", () => {
  it("достаёт вопросы из блока в конце ответа и убирает блок из текста", () => {
    const answer = [
      "## Итог",
      "Берите лён.",
      "",
      "Что спросить дальше:",
      "- Как выбрать иглу для льна?",
      "- Чем лён отличается от хлопка?",
      "- Сколько ткани купить на платье?",
    ].join("\n");

    const result = extractFollowUps(answer);

    expect(result.text).toBe("## Итог\nБерите лён.");
    expect(result.followUps).toEqual([
      "Как выбрать иглу для льна?",
      "Чем лён отличается от хлопка?",
      "Сколько ткани купить на платье?",
    ]);
  });

  it("понимает заголовок блока, выделенный жирным", () => {
    const answer = "Ответ.\n\n**Что спросить дальше:**\n- Первый вопрос?\n- Второй вопрос?";
    const result = extractFollowUps(answer);

    expect(result.followUps).toEqual(["Первый вопрос?", "Второй вопрос?"]);
    expect(result.text).toBe("Ответ.");
  });

  it("понимает заголовок блока, оформленный разметкой", () => {
    const answer = "Ответ.\n\n## Что спросить дальше:\n- Первый вопрос?\n- Второй вопрос?";
    const result = extractFollowUps(answer);

    expect(result.followUps).toEqual(["Первый вопрос?", "Второй вопрос?"]);
    expect(result.text).toBe("Ответ.");
  });

  it("сохраняет текст, который модель дописала после блока вопросов", () => {
    const answer = [
      "Ответ.",
      "Что спросить дальше:",
      "- Первый вопрос?",
      "",
      "P.S. Проверьте на лоскуте.",
    ].join("\n");

    const result = extractFollowUps(answer);

    expect(result.followUps).toEqual(["Первый вопрос?"]);
    expect(result.text).toBe("Ответ.\n\nP.S. Проверьте на лоскуте.");
  });

  it("понимает нумерованный список вопросов", () => {
    const answer = "Ответ.\nЧто спросить дальше:\n1. Первый вопрос?\n2. Второй вопрос?";
    const result = extractFollowUps(answer);

    expect(result.followUps).toEqual(["Первый вопрос?", "Второй вопрос?"]);
  });

  it("если блока нет, текст не меняется", () => {
    const answer = "Просто ответ без вопросов.";
    const result = extractFollowUps(answer);

    expect(result.text).toBe(answer);
    expect(result.followUps).toEqual([]);
  });

  it("заголовок «Вопросы» убирается вместе с блоком", () => {
    const answer = [
      "## Итог",
      "Берите лён.",
      "",
      "## Вопросы",
      "Что спросить дальше:",
      "- Как выбрать иглу для льна?",
      "- Чем лён отличается от хлопка?",
    ].join("\n");

    const result = extractFollowUps(answer);

    expect(result.followUps).toEqual([
      "Как выбрать иглу для льна?",
      "Чем лён отличается от хлопка?",
    ]);
    expect(result.text).toBe("## Итог\nБерите лён.");
  });

  it("заголовок «Вопросы» со списком без «Что спросить дальше»", () => {
    const answer = "Ответ.\n\n## Вопросы\n- Первый вопрос?\n- Второй вопрос?";

    const result = extractFollowUps(answer);

    expect(result.followUps).toEqual(["Первый вопрос?", "Второй вопрос?"]);
    expect(result.text).toBe("Ответ.");
  });

  it("обычный раздел «Вопросы» остаётся в тексте", () => {
    const answer = "Ответ.\n\n## Вопросы\nТут ответ на вопрос пользователя.";

    const result = extractFollowUps(answer);

    expect(result.followUps).toEqual([]);
    expect(result.text).toBe(answer);
  });

  it("оставляет не больше трёх вопросов", () => {
    const answer = [
      "Ответ.",
      "Что спросить дальше:",
      "- Один?",
      "- Два?",
      "- Три?",
      "- Четыре?",
    ].join("\n");

    expect(extractFollowUps(answer).followUps).toHaveLength(3);
  });

  it("не берёт слишком длинные строки и повторы", () => {
    const answer = [
      "Ответ.",
      "Что спросить дальше:",
      `- ${"а".repeat(200)}`,
      "- Один и тот же вопрос?",
      "- Один и тот же вопрос?",
    ].join("\n");

    expect(extractFollowUps(answer).followUps).toEqual(["Один и тот же вопрос?"]);
  });
});

describe("countCitations", () => {
  it("считает разные источники", () => {
    expect(countCitations("Текст [1], ещё [2] и снова [1].")).toBe(2);
  });

  it("без ссылок возвращает ноль", () => {
    expect(countCitations("Текст без ссылок.")).toBe(0);
  });
});

describe("parseAnswer", () => {
  it("приводит текст к читаемому виду и выносит вопросы", () => {
    const result = parseAnswer(
      "Ответ с огрехом .\n\nЧто спросить дальше:\n- Первый вопрос?\n- Второй вопрос?"
    );

    expect(result.text).toBe("Ответ с огрехом.");
    expect(result.followUps).toEqual(["Первый вопрос?", "Второй вопрос?"]);
  });

  it("отступы вложенного списка остаются на месте", () => {
    const text = "- пункт\n  - подпункт";
    expect(parseAnswer(text).text).toBe(text);
  });

  it("текст без вопросов остаётся текстом", () => {
    const result = parseAnswer("Просто ответ.");
    expect(result.text).toBe("Просто ответ.");
    expect(result.followUps).toEqual([]);
  });

  it("придуманная метка «[каталог]» убирается", () => {
    const result = parseAnswer("Игла 90/14 для плотных тканей [каталог].");

    expect(result.text).toBe("Игла 90/14 для плотных тканей.");
  });

  it("придуманная метка убирается вместе с выделением", () => {
    const result = parseAnswer("Игла 90/14 **[каталог]** для плотных тканей.");

    expect(result.text).toBe("Игла 90/14 для плотных тканей.");
  });

  it("настоящие ссылки на источники остаются", () => {
    const result = parseAnswer("Данные из интернета [1] и [2].");

    expect(result.text).toBe("Данные из интернета [1] и [2].");
  });

  it("ссылка на запись каталога остаётся", () => {
    const text = "Смотрите [каталог](/fabrics/denim).";

    expect(parseAnswer(text).text).toBe(text);
  });
});
