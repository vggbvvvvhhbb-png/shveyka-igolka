import { and, desc, eq, lt } from "drizzle-orm";
import type { FeedbackInput } from "@shveyka/core";
import type { DatabaseClient } from "../client";
import { messageFeedback, messages } from "../schema";
import { withRetry } from "../utils/withRetry";

export type MessageFeedback = typeof messageFeedback.$inferSelect;

/** Неудачный ответ с вопросом, на который он был дан. */
export interface DownvotedAnswer {
  feedbackId: string;
  conversationId: string;
  question: string | null;
  answer: string;
  comment: string | null;
  contextSlugs: string[];
  createdAt: Date;
}

/**
 * Сохраняет оценку ответа; повторная оценка того же сообщения заменяет прежнюю.
 * Для несуществующего сообщения возвращается undefined.
 */
export async function saveFeedback(
  db: DatabaseClient,
  input: FeedbackInput
): Promise<MessageFeedback | undefined> {
  return withRetry(async () => {
    const found = await db
      .select({ id: messages.id, role: messages.role })
      .from(messages)
      .where(eq(messages.id, input.messageId))
      .limit(1);
    // Оценивать можно только ответы ассистента.
    if (!found[0] || found[0].role !== "assistant") return undefined;

    const values = {
      rating: input.rating,
      comment: input.comment,
      context_slugs: input.contextSlugs,
    };
    const rows = await db
      .insert(messageFeedback)
      .values({ id: crypto.randomUUID(), message_id: input.messageId, ...values })
      .onConflictDoUpdate({ target: messageFeedback.message_id, set: values })
      .returning();
    return rows[0];
  });
}

/** Последние ответы с оценкой «не то» вместе с вопросами — для разбора поиска контекста. */
export async function listRecentDownvotes(
  db: DatabaseClient,
  limit = 20
): Promise<DownvotedAnswer[]> {
  return withRetry(async () => {
    const rows = await db
      .select({
        feedbackId: messageFeedback.id,
        conversationId: messages.conversation_id,
        answer: messages.content,
        answerAt: messages.created_at,
        comment: messageFeedback.comment,
        contextSlugs: messageFeedback.context_slugs,
        createdAt: messageFeedback.created_at,
      })
      .from(messageFeedback)
      .innerJoin(messages, eq(messageFeedback.message_id, messages.id))
      .where(eq(messageFeedback.rating, "down"))
      .orderBy(desc(messageFeedback.created_at))
      .limit(limit);

    const result: DownvotedAnswer[] = [];
    for (const row of rows) {
      const asked = await db
        .select({ content: messages.content })
        .from(messages)
        .where(
          and(
            eq(messages.conversation_id, row.conversationId),
            eq(messages.role, "user"),
            lt(messages.created_at, row.answerAt)
          )
        )
        .orderBy(desc(messages.created_at))
        .limit(1);
      result.push({
        feedbackId: row.feedbackId,
        conversationId: row.conversationId,
        question: asked[0]?.content ?? null,
        answer: row.answer,
        comment: row.comment,
        contextSlugs: row.contextSlugs,
        createdAt: row.createdAt,
      });
    }
    return result;
  });
}
