import { asc, desc, eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { conversations, messages } from "../schema";
import { withRetry } from "../utils/withRetry";

export type Conversation = typeof conversations.$inferSelect;
export type ConversationMessage = typeof messages.$inferSelect;

/** Роль сообщения: вопрос пользователя или ответ ассистента. */
export type MessageRole = "user" | "assistant";

/** Длина заголовка диалога, если он не задан явно. */
const TITLE_MAX_LENGTH = 60;

/**
 * Заголовок диалога — первая фраза первого сообщения.
 * Длинный текст обрезается по длине, чтобы в списке диалогов не было
 * простыней.
 */
function buildTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`;
}

/**
 * Создаёт пустой диалог.
 * Заголовок можно задать сразу; если он не задан, он появится из первого
 * сообщения пользователя.
 */
export async function createConversation(
  db: DatabaseClient,
  title?: string | null
): Promise<Conversation> {
  const id = crypto.randomUUID();
  const rows = await withRetry(() =>
    db
      .insert(conversations)
      .values({ id, title: title?.trim() ? title.trim() : null })
      .returning()
  );
  return rows[0];
}

/** Возвращает диалог по id или undefined, если диалога нет. */
export async function getConversation(
  db: DatabaseClient,
  id: string
): Promise<Conversation | undefined> {
  const rows = await withRetry(() =>
    db.select().from(conversations).where(eq(conversations.id, id)).limit(1)
  );
  return rows[0];
}

/** Список диалогов, свежие сверху. */
export async function listConversations(db: DatabaseClient): Promise<Conversation[]> {
  return withRetry(() => db.select().from(conversations).orderBy(desc(conversations.updated_at)));
}

/**
 * Добавляет сообщение в диалог и обновляет его updated_at.
 * Если заголовка ещё нет, он составляется из первого сообщения пользователя.
 * Для несуществующего диалога возвращается undefined.
 * id можно задать заранее: так клиент узнаёт id ответа до его сохранения.
 * contextSlugs — записи каталога из контекста ответа ассистента; по ним
 * открытый заново диалог снова показывает кликабельные ссылки на каталог.
 */
export async function addMessage(
  db: DatabaseClient,
  conversationId: string,
  role: MessageRole,
  content: string,
  id: string = crypto.randomUUID(),
  contextSlugs: string[] = []
): Promise<ConversationMessage | undefined> {
  return withRetry(async () => {
    const conversationRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    const conversation = conversationRows[0];
    if (!conversation) return undefined;

    const inserted = await db
      .insert(messages)
      .values({ id, conversation_id: conversationId, role, content, context_slugs: contextSlugs })
      .returning();

    const title = !conversation.title && role === "user" ? buildTitle(content) : conversation.title;
    await db
      .update(conversations)
      .set({ title, updated_at: new Date() })
      .where(eq(conversations.id, conversationId));

    return inserted[0];
  });
}

/** Сообщения диалога в порядке добавления. */
export async function listMessages(
  db: DatabaseClient,
  conversationId: string
): Promise<ConversationMessage[]> {
  return withRetry(() =>
    db
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(asc(messages.created_at))
  );
}

/**
 * Удаляет диалог вместе с его сообщениями (ON DELETE CASCADE).
 * Возвращает false, если диалога не было.
 */
export async function deleteConversation(db: DatabaseClient, id: string): Promise<boolean> {
  return withRetry(async () => {
    const rows = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning({ id: conversations.id });
    return rows.length > 0;
  });
}
