import { Bot, GrammyError } from "grammy";
import { describe, expect, it } from "vitest";
import { ChannelPublishError, publishChannelPost } from "./channel";
import { canPublish, channelKeyboard, channelPostText } from "./lib/channel";
import type { MyContext } from "./session";

/** Обращения к Telegram API — вместо отправки. */
interface SentCall {
  method: string;
  payload: Record<string, unknown>;
}

/** Подменяет сеть: собирает все обращения к Telegram API. */
function captureBot(fail?: GrammyError) {
  const calls: SentCall[] = [];
  const bot = new Bot<MyContext>("123:fake");
  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    if (fail) return Promise.reject(fail);
    if (method === "getMe") {
      return Promise.resolve({
        ok: true,
        result: { id: 1, is_bot: true, first_name: "Швейка", username: "shveyka_igolka_bot" },
      } as never);
    }
    return Promise.resolve({ ok: true, result: { message_id: 42 } } as never);
  });
  return { bot, calls };
}

/** Клавиатура из отправленного сообщения. */
function markup(payload: Record<string, unknown>) {
  const kb = payload.reply_markup as { inline_keyboard: { text: string; url?: string }[][] };
  return kb.inline_keyboard;
}

/** Кнопки клавиатуры с общим типом: у URL-кнопок есть поле url. */
function rows(keyboard: { inline_keyboard: unknown[] }): { text: string; url?: string }[][] {
  return keyboard.inline_keyboard as { text: string; url?: string }[][];
}

describe("пост в канал", () => {
  it("текст короткий и без перечисления разделов", () => {
    const text = channelPostText();
    expect(text).toContain("Швейка на связи");
    expect(text).toContain("Что сделать?");
    expect(text.length).toBeLessThan(400);
  });

  it("кнопки идут по две в ряд, внизу одна широкая на сайт", () => {
    const kb = channelKeyboard({
      siteUrl: "https://shveyka-igolka.ru/",
      botUsername: "shveyka_igolka_bot",
    });
    const grid = rows(kb);
    expect(grid.map((row) => row.length)).toEqual([2, 2, 2, 1]);
    expect(grid[0][0].text).toBe("🧵 Раскрой ткани");
    expect(grid[0][0].url).toBe("https://shveyka-igolka.ru/calculator");
    expect(grid[2][1].text).toBe("🤖 Спросить бота");
    expect(grid[2][1].url).toBe("https://t.me/shveyka_igolka_bot?start=ask");
    expect(grid[3][0].text).toBe("🌐 Открыть сайт");
    expect(grid[3][0].url).toBe("https://shveyka-igolka.ru");
  });

  it("без сайта остаётся только кнопка бота", () => {
    const kb = channelKeyboard({ siteUrl: "", botUsername: "@shveyka_igolka_bot" });
    const grid = rows(kb);
    expect(grid).toHaveLength(1);
    expect(grid[0][0].url).toBe("https://t.me/shveyka_igolka_bot?start=ask");
  });

  it("пост уходит в канал вместе с кнопками", async () => {
    const { bot, calls } = captureBot();
    const post = await publishChannelPost(bot, {
      chatId: "@shveyka_igolka",
      siteUrl: "https://shveyka-igolka.ru",
    });

    expect(post.messageId).toBe(42);
    const sent = calls.find((call) => call.method === "sendMessage");
    expect(sent?.payload.chat_id).toBe("@shveyka_igolka");
    expect(sent?.payload.text).toContain("Швейка на связи");
    expect(markup(sent?.payload ?? {}).map((row) => row.length)).toEqual([2, 2, 2, 1]);
  });

  it("свой текст экранируется", async () => {
    const { bot, calls } = captureBot();
    await publishChannelPost(bot, {
      chatId: "@shveyka_igolka",
      siteUrl: "https://shveyka-igolka.ru",
      text: "<b>жирно</b> & весело",
    });

    const sent = calls.find((call) => call.method === "sendMessage");
    expect(sent?.payload.text).toBe("&lt;b&gt;жирно&lt;/b&gt; &amp; весело");
  });

  it("без канала бот объясняет, что делать", async () => {
    const { bot } = captureBot();
    await expect(publishChannelPost(bot, { chatId: "" })).rejects.toThrow(ChannelPublishError);
  });

  it("без прав на публикацию бот объясняет, что делать", async () => {
    const fail = new GrammyError(
      "Forbidden",
      { ok: false, error_code: 403, description: "bot is not a member of the channel chat" },
      "sendMessage",
      {}
    );
    const { bot } = captureBot(fail);
    await expect(publishChannelPost(bot, { chatId: "@shveyka_igolka" })).rejects.toThrow(
      /администратором/
    );
  });
});

describe("права на публикацию", () => {
  it("владелец публикует, остальные нет", () => {
    expect(canPublish(1, [1])).toBe(true);
    expect(canPublish(2, [1])).toBe(false);
    expect(canPublish(1, [])).toBe(false);
    expect(canPublish(undefined, [1])).toBe(false);
  });
});
