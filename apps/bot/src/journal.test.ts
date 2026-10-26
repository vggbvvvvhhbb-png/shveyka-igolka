import { Bot } from "grammy";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerJournal } from "./journal";

/** Обновление от Telegram — тип берём у самого grammY. */
type Update = Parameters<Bot["handleUpdate"]>[0];

/** Данные о боте: нужны, чтобы grammY не ходил в сеть за getMe. */
const botInfo = {
  id: 1,
  is_bot: true,
  first_name: "Швейка",
  username: "shveyka_test_bot",
} as NonNullable<ConstructorParameters<typeof Bot>[1]>["botInfo"];

const chat = { id: 555, type: "private" as const, first_name: "Мама" };
const from = { id: 555, is_bot: false, first_name: "Мама" };

/** Что бот передал сайту: только те поля, которые нужны для проверки. */
interface FetchCall {
  url: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

/** Сообщение с командой бота: сущность bot_command указывает на саму команду. */
function commandUpdate(text: string, commandLength: number): Update {
  return {
    update_id: 1,
    message: {
      message_id: 10,
      date: Math.floor(Date.now() / 1000),
      chat,
      from,
      text,
      entities: [{ type: "bot_command", offset: 0, length: commandLength }],
    },
  };
}

/** Бот с подменённой сетью: собираем отправленные сообщения вместо отправки. */
function makeBot(): { bot: Bot; sent: string[] } {
  const bot = new Bot("123:fake", { botInfo });
  const sent: string[] = [];
  bot.api.config.use((_prev, method, payload) => {
    if (method === "sendMessage") sent.push((payload as { text: string }).text);
    return Promise.resolve({ ok: true, result: { message_id: 1 } } as never);
  });
  return { bot, sent };
}

/** Ответ сайта с нужным телом. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Подмена сети: запоминает обращения и отдаёт заданный ответ. */
function stubSite(response: () => Response): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (
        url: string,
        init?: { method?: string; body?: string; headers?: Record<string, string> }
      ) => {
        calls.push({ url, method: init?.method, body: init?.body, headers: init?.headers });
        return response();
      }
    )
  );
  return calls;
}

const STATS = {
  stats: {
    year: 2026,
    count: 2,
    totalCost: 1900,
    totalSaved: 3100,
    pricedCount: 2,
    giftCount: 0,
    giftSpent: 0,
    topFabrics: [{ slug: "linen-natural", name: "Лён", count: 1 }],
  },
};

describe("журнал шитья в боте", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("записывает вещь в общий журнал и называет экономию", async () => {
    const calls = stubSite(() => jsonResponse({ item: { id: "1" } }, 201));
    const { bot, sent } = makeBot();
    registerJournal(bot, "http://web:3000");

    await bot.handleUpdate(commandUpdate("/sewn Юбка из льна; 700; 2500; linen-natural", 5));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://web:3000/api/sewn");
    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(String(calls[0].body))).toEqual({
      name: "Юбка из льна",
      cost: 700,
      marketPrice: 2500,
      fabricSlug: "linen-natural",
      gift: false,
    });
    expect(sent[0]).toContain("Записано");
    expect(sent[0]).toContain("Юбка из льна");
    expect(sent[0]).toContain("Экономия");
  });

  it("объясняет формат, если затраты не указаны, и не ходит в сеть", async () => {
    const calls = stubSite(() => jsonResponse({}));
    const { bot, sent } = makeBot();
    registerJournal(bot, "http://web:3000");

    await bot.handleUpdate(commandUpdate("/sewn Юбка", 5));

    expect(calls).toHaveLength(0);
    expect(sent[0]).toContain("Формат");
  });

  it("показывает итоги года", async () => {
    const calls = stubSite(() => jsonResponse(STATS));
    const { bot, sent } = makeBot();
    registerJournal(bot, "http://web:3000");

    await bot.handleUpdate(commandUpdate("/year", 5));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://web:3000/api/sewn");
    expect(calls[0].method).toBeUndefined();
    expect(sent[0]).toContain("Итоги 2026 года");
    expect(sent[0]).toContain("Сшито вещей: 2");
    expect(sent[0]).toContain("Лён");
  });

  it("отдельно упоминает подарки", async () => {
    stubSite(() =>
      jsonResponse({
        stats: { ...STATS.stats, giftCount: 1, giftSpent: 900 },
      })
    );
    const { bot, sent } = makeBot();
    registerJournal(bot, "http://web:3000");

    await bot.handleUpdate(commandUpdate("/year", 5));

    expect(sent[0]).toContain("Подарков: 1");
    expect(sent[0]).toContain("900");
  });

  it("говорит, что записей пока нет", async () => {
    stubSite(() =>
      jsonResponse({
        stats: {
          ...STATS.stats,
          count: 0,
          totalCost: 0,
          totalSaved: 0,
          pricedCount: 0,
          topFabrics: [],
        },
      })
    );
    const { bot, sent } = makeBot();
    registerJournal(bot, "http://web:3000");

    await bot.handleUpdate(commandUpdate("/year", 5));

    expect(sent[0]).toContain("записей пока нет");
  });

  it("не падает, если сайт недоступен", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("соединение отклонено");
      })
    );
    const { bot, sent } = makeBot();
    registerJournal(bot, "http://web:3000");

    await bot.handleUpdate(commandUpdate("/year", 5));

    expect(sent[0]).toContain("Сайт сейчас недоступен");
  });

  it("показывает ключ владельца, когда журнал закрыт замком", async () => {
    const calls = stubSite(() => jsonResponse({ item: { id: "1" } }, 201));
    const { bot } = makeBot();
    registerJournal(bot, "http://web:3000", "секретный ключ");

    await bot.handleUpdate(commandUpdate("/sewn Юбка из льна; 700; 2500; linen-natural", 5));

    expect(calls[0].headers?.Cookie).toBe("shveyka_owner=" + encodeURIComponent("секретный ключ"));
  });

  it("без ключа владельца cookie не отправляет", async () => {
    const calls = stubSite(() => jsonResponse(STATS));
    const { bot } = makeBot();
    registerJournal(bot, "http://web:3000");

    await bot.handleUpdate(commandUpdate("/year", 5));

    expect(calls[0].headers?.Cookie).toBeUndefined();
  });
});
