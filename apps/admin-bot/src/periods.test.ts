import { describe, expect, it } from "vitest";
import { nextReportTime, parsePeriod, periodRange } from "./periods";

describe("периоды отчёта", () => {
  it("разбирает период из команды", () => {
    expect(parsePeriod(undefined)).toBe("day");
    expect(parsePeriod("")).toBe("day");
    expect(parsePeriod("неделя")).toBe("week");
    expect(parsePeriod("Неделя")).toBe("week");
    expect(parsePeriod("месяц")).toBe("month");
    expect(parsePeriod("month")).toBe("month");
  });

  it("«день» — это московские сутки", () => {
    // 21:30 по Москве 4 ноября.
    const now = new Date("2026-11-04T18:30:00.000Z");
    const range = periodRange("day", now);

    expect(range.title).toBe("сегодня");
    // Начало суток в UTC: 21:00 предыдущего дня.
    expect(range.from.toISOString()).toBe("2026-11-03T21:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-04T21:00:00.000Z");
  });

  it("«неделя» — последние семь дней вместе с сегодняшним", () => {
    const now = new Date("2026-11-04T12:00:00.000Z");
    const range = periodRange("week", now);

    expect(range.title).toBe("7 дней");
    expect(range.from.toISOString()).toBe("2026-10-28T21:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-04T21:00:00.000Z");
  });

  it("«месяц» — последние тридцать дней", () => {
    const now = new Date("2026-11-04T12:00:00.000Z");
    const range = periodRange("month", now);

    expect(range.title).toBe("30 дней");
    expect(range.from.toISOString()).toBe("2026-10-05T21:00:00.000Z");
  });
});

describe("время ежедневного отчёта", () => {
  it("сегодняшний час ещё не наступил — ждём сегодня", () => {
    const now = new Date("2026-11-04T12:00:00.000Z"); // 15:00 МСК
    const next = nextReportTime(21, now);
    expect(next.toISOString()).toBe("2026-11-04T18:00:00.000Z");
  });

  it("час уже прошёл — ждём следующего дня", () => {
    const now = new Date("2026-11-04T20:00:00.000Z"); // 23:00 МСК
    const next = nextReportTime(21, now);
    expect(next.toISOString()).toBe("2026-11-05T18:00:00.000Z");
  });

  it("ровно в час отчёта ждём следующих суток", () => {
    const now = new Date("2026-11-04T18:00:00.000Z"); // 21:00 МСК
    const next = nextReportTime(21, now);
    expect(next.toISOString()).toBe("2026-11-05T18:00:00.000Z");
  });
});
