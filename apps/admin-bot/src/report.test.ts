import { describe, expect, it } from "vitest";
import { buildCsv, buildReport, buildUserReport, estimateCost, featureLabel } from "./report";

/** Пустая разбивка по функциям. */
const emptyFeature = { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };

/**
 * Разделитель тысяч в русском формате — неразрывный пробел. В проверках он
 * мешает, поэтому текст приводится к обычным пробелам.
 */
function plain(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

describe("отчёт о расходе", () => {
  it("показывает итоги, режимы и людей", () => {
    const text = buildReport({
      title: "сегодня",
      totals: {
        requests: 3,
        promptTokens: 1200,
        completionTokens: 800,
        totalTokens: 2000,
      },
      byFeature: [{ feature: "catalog", ...emptyFeature, requests: 2, totalTokens: 500 }],
      bySource: [{ source: "bot", ...emptyFeature, requests: 3, totalTokens: 2000 }],
      topUsers: [
        {
          userKey: "tg:12345",
          userLabel: "Аня",
          ...emptyFeature,
          requests: 3,
          totalTokens: 2000,
          lastSeen: new Date("2026-11-04T10:00:00.000Z"),
        },
      ],
    });

    expect(text).toContain("Расход помощника — сегодня");
    expect(text).toContain("Запросов: 3");
    expect(plain(text)).toContain("Токенов: 2 000");
    expect(text).toContain("Каталог");
    expect(text).toContain("Telegram-бот");
    expect(text).toContain("Аня (tg:12345)");
  });

  it("говорит, когда запросов не было", () => {
    const text = buildReport({
      title: "сегодня",
      totals: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      byFeature: [],
      bySource: [],
      topUsers: [],
    });

    expect(text).toContain("За этот период запросов не было.");
  });

  it("подставляет стоимость, если она посчитана", () => {
    const text = buildReport({
      title: "сегодня",
      totals: { requests: 1, promptTokens: 1000, completionTokens: 0, totalTokens: 1000 },
      byFeature: [],
      bySource: [],
      topUsers: [],
      cost: "≈ 1.20 ₽",
    });

    expect(text).toContain("Ориентировочная стоимость: ≈ 1.20 ₽");
  });
});

describe("отчёт по человеку", () => {
  it("показывает последние запросы", () => {
    const text = buildUserReport({
      userKey: "tg:12345",
      userLabel: null,
      title: "7 дней",
      totals: { requests: 2, promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      byFeature: [{ feature: "research", ...emptyFeature, requests: 2, totalTokens: 150 }],
      recent: [
        {
          id: "1",
          userKey: "tg:12345",
          userLabel: null,
          source: "bot",
          feature: "research",
          mode: null,
          model: "free/gpt-6-luna",
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimated: false,
          cached: false,
          createdAt: new Date("2026-11-04T10:00:00.000Z"),
        },
      ],
    });

    expect(text).toContain("tg:12345");
    expect(text).toContain("Период: 7 дней");
    expect(text).toContain("Ресёрч");
    expect(text).toContain("Последние запросы:");
  });
});

describe("подписи и деньги", () => {
  it("известные режимы — по-русски, новые — как есть", () => {
    expect(featureLabel("catalog")).toBe("Каталог");
    expect(featureLabel("research")).toBe("Ресёрч");
    expect(featureLabel("что-то новое")).toBe("что-то новое");
  });

  it("стоимость считается только с ценой", () => {
    expect(estimateCost(1_000_000, 10)).toBe("≈ 10.00 ₽");
    expect(estimateCost(1_000_000, 0)).toBeNull();
    expect(estimateCost(1_000_000, Number.NaN)).toBeNull();
  });
});

describe("выгрузка в CSV", () => {
  it("первая строка — заголовок", () => {
    const csv = buildCsv([
      {
        id: "1",
        userKey: "tg:1",
        userLabel: "Аня",
        source: "bot",
        feature: "catalog",
        mode: "short",
        model: "gpt",
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        estimated: false,
        cached: false,
        createdAt: new Date("2026-11-04T10:00:00.000Z"),
      },
    ]);

    const lines = csv.split("\n");
    expect(lines[0]).toContain("Пользователь");
    expect(lines[1]).toContain("tg:1");
    expect(lines[1]).toContain("Аня");
  });
});
