import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import { addMessage, createConversation } from "./conversations";
import { listRecentDownvotes, saveFeedback } from "./feedback";

/** Пауза, чтобы у соседних записей различались метки времени. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("оценки ответов в pglite", () => {
  let db: DatabaseClient;
  let conversationId: string;
  let answerId: string;
  let questionId: string;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;

    await client.exec(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        context_slugs JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE message_feedback (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        rating TEXT NOT NULL,
        comment TEXT,
        context_slugs JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX message_feedback_message_id_uq ON message_feedback (message_id);
    `);

    conversationId = (await createConversation(db)).id;
    const question = await addMessage(db, conversationId, "user", "Как шить шёлк?");
    questionId = question!.id;
    await sleep(10);
    answerId = crypto.randomUUID();
    await addMessage(db, conversationId, "assistant", "Берите иглу 70/10.", answerId);
  });

  it("addMessage использует заданный id", async () => {
    expect(answerId.length).toBeGreaterThan(0);
    const other = await addMessage(db, conversationId, "assistant", "Ещё ответ", "custom-id");
    expect(other?.id).toBe("custom-id");
  });

  it("не принимает оценку несуществующего сообщения и вопроса пользователя", async () => {
    const input = { rating: "up" as const, comment: null, contextSlugs: [] };
    expect(await saveFeedback(db, { ...input, messageId: "нет-такого" })).toBeUndefined();
    expect(await saveFeedback(db, { ...input, messageId: questionId })).toBeUndefined();
  });

  it("повторная оценка заменяет прежнюю", async () => {
    await saveFeedback(db, { messageId: answerId, rating: "up", comment: null, contextSlugs: [] });
    const second = await saveFeedback(db, {
      messageId: answerId,
      rating: "down",
      comment: "Не про шёлк",
      contextSlugs: ["fabrics/denim"],
    });

    expect(second?.rating).toBe("down");
    expect(second?.context_slugs).toEqual(["fabrics/denim"]);
    const rows = await db.select().from(schema.messageFeedback);
    expect(rows).toHaveLength(1);
  });

  it("отчёт показывает вопрос, контекст и комментарий к неудачному ответу", async () => {
    const items = await listRecentDownvotes(db);

    expect(items).toHaveLength(1);
    expect(items[0].question).toBe("Как шить шёлк?");
    expect(items[0].answer).toBe("Берите иглу 70/10.");
    expect(items[0].comment).toBe("Не про шёлк");
    expect(items[0].contextSlugs).toEqual(["fabrics/denim"]);
  });
});
