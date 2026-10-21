import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Bot } from "grammy";
import { describe, expect, it } from "vitest";
import { createBot, type BotInfo } from "./bot";

/** Обновление от Telegram — тип берём у самого grammY. */
type Update = Parameters<Bot["handleUpdate"]>[0];

interface SentCall {
  method: string;
  payload: Record<string, unknown>;
}

/** Данные о боте: нужны, чтобы grammY не ходил в сеть за getMe. */
const botInfo = {
  id: 1,
  is_bot: true,
  first_name: "Швейка",
  username: "shveyka_test_bot",
} as BotInfo;

/** Подменяет сеть: собирает все обращения к Telegram API вместо отправки. */
function capture(bot: ReturnType<typeof createBot>): SentCall[] {
  const calls: SentCall[] = [];
  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return Promise.resolve({ ok: true, result: { message_id: 1 } } as never);
  });
  return calls;
}

const chat = { id: 555, type: "private" as const, first_name: "Мама" };
const from = { id: 555, is_bot: false, first_name: "Мама" };

const startUpdate: Update = {
  update_id: 1,
  message: {
    message_id: 10,
    date: Math.floor(Date.now() / 1000),
    chat,
    from,
    text: "/start",
    entities: [{ type: "bot_command", offset: 0, length: 6 }],
  },
};

const menuButtonUpdate: Update = {
  update_id: 2,
  callback_query: {
    id: "cb-1",
    from,
    chat_instance: "ci-1",
    data: "menu:cut",
    message: {
      message_id: 10,
      date: Math.floor(Date.now() / 1000),
      chat,
      from,
      text: "Что посчитаем?",
    },
  },
};

describe("бот целиком", () => {
  it("здоровается и показывает меню", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "shveyka-bot-"));
    const bot = createBot("123:fake", dir, botInfo);
    const calls = capture(bot);

    await bot.handleUpdate(startUpdate);

    const sent = calls.filter((c) => c.method === "sendMessage");
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.text).toContain("Привет");
    expect(sent[0].payload.reply_markup).toBeTruthy();
  });

  it("начинает сценарий по кнопке меню", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "shveyka-bot-"));
    const bot = createBot("123:fake", dir, botInfo);
    const calls = capture(bot);

    await bot.handleUpdate(menuButtonUpdate);

    const sent = calls.filter((c) => c.method === "sendMessage");
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.text).toContain("Раскрой ткани");
    expect(calls.some((c) => c.method === "answerCallbackQuery")).toBe(true);
  });

  it("хранит состояние диалога на диске", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "shveyka-bot-"));
    const bot = createBot("123:fake", dir, botInfo);
    capture(bot);

    await bot.handleUpdate(menuButtonUpdate);

    const files = await readdir(path.join(dir, "sessions"));
    expect(files.length).toBe(1);
  });

  it("продолжает диалог после перезапуска бота", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "shveyka-bot-"));
    const first = createBot("123:fake", dir, botInfo);
    capture(first);
    await first.handleUpdate(menuButtonUpdate);

    // Новый экземпляр читает состояние с диска, как после перезапуска.
    const second = createBot("123:fake", dir, botInfo);
    const calls = capture(second);
    await second.handleUpdate({
      update_id: 3,
      message: {
        message_id: 11,
        date: Math.floor(Date.now() / 1000),
        chat,
        from,
        text: "платье",
      },
    });

    // Ответ на «текстовый» вопрос: бот просит выбрать вариант кнопкой.
    const sent = calls.filter((c) => c.method === "sendMessage");
    expect(sent[0].payload.text).toContain("Выбери вариант кнопкой");
  });
});
