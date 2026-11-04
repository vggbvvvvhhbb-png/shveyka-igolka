import { afterEach, describe, expect, it, vi } from "vitest";

import { createBot } from "../test/harness";
import { registerWizard, startWizard } from "../wizard";
import { measureWizard } from "./measure";

registerWizard(measureWizard);

/** Подставляет ответы сайта: GET отдаёт текущие мерки, PUT — сохранённые. */
function mockSite(current: Record<string, number> | null) {
  const put = vi.fn(async (_url: string, _init?: { body?: string }) => ({
    ok: true,
    status: 200,
    json: async () => ({ measurements: current ?? {} }),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "PUT") return put(url, init);
      return {
        ok: true,
        status: 200,
        json: async () => ({ measurements: current }),
      };
    })
  );
  return put;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("мерки в боте", () => {
  it("спрашивает каждую мерку и сохраняет ответы", async () => {
    const put = mockSite(null);

    const bot = createBot();
    await startWizard(bot.ctx, measureWizard, { bust: 0, waist: 0, hip: 0, height: 0 });

    expect(bot.last()).toContain("Обхват груди");
    await bot.say("92");
    expect(bot.last()).toContain("Обхват талии");
    await bot.say("74");
    expect(bot.last()).toContain("Обхват бёдер");
    await bot.say("98");
    expect(bot.last()).toContain("Рост");
    await bot.say("164");

    expect(bot.last()).toContain("Мерки сохранены");
    expect(put).toHaveBeenCalledTimes(1);

    const body = JSON.parse((put.mock.calls[0]?.[1] as { body: string }).body);
    expect(body).toEqual({ bust: 92, waist: 74, hip: 98, height: 164 });
  });

  it("пропущенная мерка не затирает прежнее значение", async () => {
    const put = mockSite({ bust: 90, waist: 70 });

    const bot = createBot();
    await startWizard(bot.ctx, measureWizard, { bust: 90, waist: 70, hip: 0, height: 0 });

    await bot.press("w:skip"); // обхват груди — «Не знаю»
    await bot.press("w:skip"); // талия
    await bot.say("96"); // бёдра
    await bot.press("w:skip"); // рост

    const body = JSON.parse((put.mock.calls[0]?.[1] as { body: string }).body);
    expect(body).toEqual({ bust: 90, waist: 70, hip: 96 });
  });

  it("говорит, что сайт недоступен, если мерки не пришли", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      }))
    );

    const bot = createBot();
    await startWizard(bot.ctx, measureWizard, { bust: 0, waist: 0, hip: 0, height: 0 });
    await bot.say("92");
    await bot.say("74");
    await bot.say("98");
    await bot.say("164");

    expect(bot.last()).toContain("Сайт сейчас недоступен");
  });
});
