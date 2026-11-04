import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Тест разговора бота с сайтом.
 *
 * Главное здесь — заголовки: имя пользователя Telegram часто на русском,
 * а значение заголовка — байтовая строка. Без кодирования кириллицы запрос
 * падал целиком, и человек видел «Сайт сейчас недоступен».
 */

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.stubGlobal("fetch", mocks.fetch);

import { askCatalog, askWeb } from "./api";

describe("заголовки бота", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("имя на русском уходит закодированным", async () => {
    mocks.fetch.mockResolvedValue(new Response("Ответ", { status: 200 }));

    await askCatalog("какая игла", null, { id: 42, name: "Аня Иванова" });

    const init = mocks.fetch.mock.calls[0][1] as { headers: Record<string, string> };
    const header = init.headers["X-Shveyka-User-Name"];
    expect(header).toBe(encodeURIComponent("Аня Иванова"));
    expect(header).toMatch(/^[\x20-\x7e]+$/);
  });

  it("латинское имя остаётся читаемым", async () => {
    mocks.fetch.mockResolvedValue(new Response("Ответ", { status: 200 }));

    await askCatalog("какая игла", null, { id: 42, name: "Anne" });

    const init = mocks.fetch.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers["X-Shveyka-User-Name"]).toBe("Anne");
  });

  it("без имени заголовок не добавляется", async () => {
    mocks.fetch.mockResolvedValue(new Response("Ответ", { status: 200 }));

    await askCatalog("какая игла", null, { id: 42 });

    const init = mocks.fetch.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers["X-Shveyka-User-Name"]).toBeUndefined();
    expect(init.headers["X-Shveyka-User"]).toBe("tg:42");
  });

  it("режим с интернетом тоже передаёт имя закодированным", async () => {
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          answer: "Ответ",
          mode: "search",
          sources: [],
          steps: [],
          model: "free/gpt-6-luna",
          degraded: null,
          followUps: [],
          related: [],
          conversationId: null,
        }),
        { status: 200 }
      )
    );

    await askWeb("какая игла", "search", null, { id: 42, name: "Аня" });

    const init = mocks.fetch.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers["X-Shveyka-User-Name"]).toBe(encodeURIComponent("Аня"));
  });
});
