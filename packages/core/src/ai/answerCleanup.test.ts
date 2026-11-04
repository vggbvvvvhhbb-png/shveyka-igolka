import { describe, expect, it } from "vitest";

import { parseAnswer, removeRepeatedSections, stripLinkTags } from "./answerFormat";

describe("stripLinkTags", () => {
  it("переводит служебный тег ссылки в обычную ссылку", () => {
    expect(stripLinkTags('<Link url="https://example.com/a" title="Статья"/>')).toBe(
      "[Статья](https://example.com/a)"
    );
  });

  it("переносит одинарные кавычки и пробелы", () => {
    expect(stripLinkTags("<Link url='https://example.com/b' title='Заголовок' />")).toBe(
      "[Заголовок](https://example.com/b)"
    );
  });

  it("оставляет адрес, если заголовка нет", () => {
    expect(stripLinkTags('<Link url="https://example.com/c"/>')).toBe("https://example.com/c");
  });

  it("не трогает обычный текст", () => {
    const text = "Ссылка [Лён](/fabrics/linen-natural) и 5 < 7";
    expect(stripLinkTags(text)).toBe(text);
  });
});

describe("removeRepeatedSections", () => {
  it("оставляет первую копию повторяющегося раздела", () => {
    const text = ["## Короткий вывод", "Берите лён.", "", "## Короткий вывод", "Берите лён."].join(
      "\n"
    );

    const result = removeRepeatedSections(text);

    expect(result.match(/## Короткий вывод/g)).toHaveLength(1);
    expect(result).toContain("Берите лён.");
  });

  it("разные разделы с одинаковым названием оставляет как есть", () => {
    const text = ["## Итог", "Первый вывод.", "", "## Итог", "Второй вывод."].join("\n");

    expect(removeRepeatedSections(text)).toBe(text);
  });

  it("текст до первого заголовка не теряет", () => {
    const text = "Вступление.\n\n## Раздел\nТекст.";
    expect(removeRepeatedSections(text)).toContain("Вступление.");
  });

  it("убирает повтор, который отличается только пробелами", () => {
    const text = ["## Итог", "Первый  вывод.", "", "## Итог", "Первый вывод."].join("\n");
    expect(removeRepeatedSections(text).match(/## Итог/g)).toHaveLength(1);
  });
});

describe("parseAnswer", () => {
  it("убирает повторяющийся раздел и служебные теги ссылок", () => {
    const text = [
      "## Короткий вывод",
      "Берите лён.",
      "",
      "## Короткий вывод",
      "Берите лён.",
      "",
      "## Источники",
      '<Link url="https://example.com/a" title="Статья"/>',
    ].join("\n");

    const result = parseAnswer(text);

    expect(result.text.match(/## Короткий вывод/g)).toHaveLength(1);
    expect(result.text).not.toContain("<Link");
    expect(result.text).toContain("[Статья](https://example.com/a)");
  });
});
