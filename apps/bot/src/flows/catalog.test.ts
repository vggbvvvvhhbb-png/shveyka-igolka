import { afterEach, describe, expect, it, vi } from "vitest";

import { createBot } from "../test/harness";
import { registerWizard, startWizard } from "../wizard";
import { assistantWizard } from "./assistant";
import { searchWizard } from "./search";

registerWizard(searchWizard);
registerWizard(assistantWizard);

/** Подставляет ответ сайта вместо настоящего запроса. */
function mockApi(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: (init.status ?? 200) < 400,
      status: init.status ?? 200,
      headers: new Headers(init.headers ?? {}),
      json: async () => body,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("поиск по справочнику", () => {
  it("находит ткань и показывает ссылку на сайт", async () => {
    mockApi({
      query: "лён",
      total: 1,
      fabrics: [{ slug: "linen-natural", name: "Лён", hint: "плотность 140–190 г/м²" }],
      seams: [],
      projects: [],
    });

    const bot = createBot();
    await startWizard(bot.ctx, searchWizard);
    await bot.say("лён");

    const text = bot.last();
    expect(text).toContain("Лён");
    expect(text).toContain("плотность 140–190");
    expect(text).toContain("нашлось 1");
  });

  it("объясняет, когда ничего не нашлось", async () => {
    mockApi({ query: "xyz", total: 0, fabrics: [], seams: [], projects: [] });

    const bot = createBot();
    await startWizard(bot.ctx, searchWizard);
    await bot.say("xyz");

    expect(bot.last()).toContain("ничего не нашлось");
  });

  it("говорит, что сайт недоступен, если запрос не прошёл", async () => {
    mockApi({}, { status: 500 });

    const bot = createBot();
    await startWizard(bot.ctx, searchWizard);
    await bot.say("лён");

    expect(bot.last()).toContain("Сайт сейчас недоступен");
  });
});

describe("помощник в боте", () => {
  it("спрашивает режим и принимает вопрос", async () => {
    mockApi("Ответ: берите лён.");

    const bot = createBot();
    await startWizard(bot.ctx, assistantWizard);

    expect(bot.last()).toContain("Выбери режим");

    await bot.press("w:chat");
    expect(bot.last()).toContain("Напиши вопрос");

    await bot.say("какая игла для льна");
    expect(bot.last()).toContain("берите лён");
  });

  it("в режиме с интернетом показывает источники", async () => {
    mockApi({
      answer: "## Короткий вывод\nБерите лён.",
      mode: "search",
      sources: [{ title: "Как усаживается лён", url: "https://example.com/linen" }],
      steps: ["Найдено 2 страницы"],
      model: "gpt-6-luna",
      degraded: null,
      followUps: [],
      related: [],
      conversationId: "conv-1",
    });

    const bot = createBot();
    await startWizard(bot.ctx, assistantWizard);
    await bot.press("w:search");
    await bot.say("как усаживается лён");

    const text = bot.last();
    expect(text).toContain("Короткий вывод");
    expect(text).toContain("Источники");
    expect(text).toContain("Как усаживается лён");
  });

  it("помнит id диалога, чтобы продолжить разговор", async () => {
    mockApi("Ответ: берите лён.", { headers: { "X-Conversation-Id": "conv-42" } });

    const bot = createBot();
    await startWizard(bot.ctx, assistantWizard);
    await bot.press("w:chat");
    await bot.say("какая игла для льна");

    expect(bot.ctx.session.conversationId).toBe("conv-42");
  });

  it("объясняет, что запросов слишком много", async () => {
    mockApi({}, { status: 429 });

    const bot = createBot();
    await startWizard(bot.ctx, assistantWizard);
    await bot.press("w:chat");
    await bot.say("какая игла для льна");

    expect(bot.last()).toContain("Слишком много запросов");
  });
});
