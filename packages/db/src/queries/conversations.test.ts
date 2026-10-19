import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import {
  createConversation,
  getConversation,
  listConversations,
  addMessage,
  listMessages,
  deleteConversation,
} from "./conversations";

/** Пауза, чтобы у соседних записей различались метки времени. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("диалоги в pglite", () => {
  // PGlite-клиент отличается от node-postgres по типам (другая реализация HKT),
  // хотя SQL слоя запросов выполняется одинаково — приводим тип вручную.
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;

    await client.exec(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.exec(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  });

  it("создаёт пустой диалог без заголовка", async () => {
    const conversation = await createConversation(db);

    expect(conversation.id.length).toBeGreaterThan(0);
    expect(conversation.title).toBeNull();
    expect(await getConversation(db, conversation.id)).toBeDefined();
  });

  it("сохраняет заданный заголовок", async () => {
    const conversation = await createConversation(db, "  Джинсы  ");

    expect(conversation.title).toBe("Джинсы");
  });

  it("не добавляет сообщение в несуществующий диалог", async () => {
    const message = await addMessage(db, "нет-такого", "user", "Привет");

    expect(message).toBeUndefined();
  });

  it("берёт заголовок из первого сообщения пользователя", async () => {
    const conversation = await createConversation(db);

    await addMessage(db, conversation.id, "user", "Какую иглу взять для джинсы?");

    const updated = await getConversation(db, conversation.id);
    expect(updated?.title).toBe("Какую иглу взять для джинсы?");
  });

  it("не меняет заголовок, заданный при создании", async () => {
    const conversation = await createConversation(db, "Своё название");

    await addMessage(db, conversation.id, "user", "Другое сообщение");

    const updated = await getConversation(db, conversation.id);
    expect(updated?.title).toBe("Своё название");
  });

  it("обрезает длинный заголовок до 60 символов", async () => {
    const conversation = await createConversation(db);
    const long = "я".repeat(120);

    await addMessage(db, conversation.id, "user", long);

    const updated = await getConversation(db, conversation.id);
    expect(updated?.title?.length).toBeLessThanOrEqual(61);
    expect(updated?.title?.endsWith("…")).toBe(true);
  });

  it("возвращает сообщения в порядке добавления", async () => {
    const conversation = await createConversation(db);

    await addMessage(db, conversation.id, "user", "Первый вопрос");
    await sleep(5);
    await addMessage(db, conversation.id, "assistant", "Первый ответ");
    await sleep(5);
    await addMessage(db, conversation.id, "user", "Второй вопрос");

    const messages = await listMessages(db, conversation.id);

    expect(messages.map((m) => m.content)).toEqual([
      "Первый вопрос",
      "Первый ответ",
      "Второй вопрос",
    ]);
    expect(messages.every((m) => m.conversation_id === conversation.id)).toBe(true);
  });

  it("увеличивает updated_at диалога после нового сообщения", async () => {
    const conversation = await createConversation(db);
    const before = await getConversation(db, conversation.id);

    await sleep(5);
    await addMessage(db, conversation.id, "user", "Сообщение");

    const after = await getConversation(db, conversation.id);
    expect(after!.updated_at.getTime()).toBeGreaterThan(before!.updated_at.getTime());
  });

  it("сортирует список диалогов по свежести", async () => {
    const first = await createConversation(db, "Первый диалог");
    await sleep(5);
    const second = await createConversation(db, "Второй диалог");

    const list = await listConversations(db);
    const ids = list.map((c) => c.id);

    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });

  it("удаляет диалог вместе с сообщениями", async () => {
    const conversation = await createConversation(db);
    await addMessage(db, conversation.id, "user", "Вопрос");
    await addMessage(db, conversation.id, "assistant", "Ответ");

    const deleted = await deleteConversation(db, conversation.id);

    expect(deleted).toBe(true);
    expect(await getConversation(db, conversation.id)).toBeUndefined();
    expect(await listMessages(db, conversation.id)).toEqual([]);
  });

  it("удаление неизвестного диалога возвращает false", async () => {
    expect(await deleteConversation(db, "нет-такого")).toBe(false);
  });
});
