import { describe, expect, it } from "vitest";

import { markdownToTelegramHtml } from "./markdown";

describe("перевод ответа помощника в разметку телеграма", () => {
  it("делает заголовок жирным", () => {
    expect(markdownToTelegramHtml("## Что делать")).toBe("<b>Что делать</b>");
  });

  it("переводит пункт списка в буллет", () => {
    expect(markdownToTelegramHtml("- игла №90/14")).toBe("• игла №90/14");
  });

  it("сохраняет нумерацию", () => {
    expect(markdownToTelegramHtml("1. Декатируйте ткань")).toBe("1. Декатируйте ткань");
  });

  it("переводит жирное выделение", () => {
    expect(markdownToTelegramHtml("Берите **лён**")).toBe("Берите <b>лён</b>");
  });

  it("экранирует специальные символы телеграма", () => {
    expect(markdownToTelegramHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("оставляет внешнюю ссылку ссылкой", () => {
    expect(markdownToTelegramHtml("[Источник](https://example.com/a)")).toBe(
      '<a href="https://example.com/a">Источник</a>'
    );
  });

  it("внутреннюю ссылку каталога делает полным адресом сайта", () => {
    const html = markdownToTelegramHtml(
      "[Лён](/fabrics/linen-natural)",
      "https://shveyka-igolka.ru"
    );
    expect(html).toBe('<a href="https://shveyka-igolka.ru/fabrics/linen-natural">Лён</a>');
  });

  it("внутреннюю ссылку без адреса сайта оставляет текстом", () => {
    expect(markdownToTelegramHtml("[Лён](/fabrics/linen-natural)", "")).toBe("Лён");
  });

  it("опасную ссылку оставляет текстом", () => {
    expect(markdownToTelegramHtml("[клик](javascript:alert(1))")).toBe("клик");
  });

  it("не ломает нумерацию источников в квадратных скобках", () => {
    expect(markdownToTelegramHtml("По данным [1] и [2]")).toBe("По данным [1] и [2]");
  });

  it("схлопывает пустые строки", () => {
    expect(markdownToTelegramHtml("первый\n\n\n\nвторой")).toBe("первый\n\nвторой");
  });
});
