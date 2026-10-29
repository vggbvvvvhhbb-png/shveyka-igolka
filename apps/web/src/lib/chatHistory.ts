import { isUuid } from "@shveyka/core";
import { queries, type DatabaseClient, type RelatedRow, type SourceRow } from "@shveyka/db";
import { logFailure } from "@/lib/apiResponse";

/**
 * Записывает вопрос пользователя в диалог и возвращает id диалога.
 * Если id не передан или диалога нет — создаёт новый. Сбой истории не должен
 * ломать чат, поэтому при ошибке возвращается null, и ответ идёт без сохранения.
 */
export async function saveUserTurn(
  db: DatabaseClient,
  requestId: string,
  conversationId: string | null,
  content: string
): Promise<string | null> {
  try {
    let id: string | null = null;
    if (isUuid(conversationId) && (await queries.getConversation(db, conversationId))) {
      id = conversationId;
    }
    if (!id) id = (await queries.createConversation(db)).id;
    await queries.addMessage(db, id, "user", content);
    return id;
  } catch (err) {
    logFailure("chat-history", requestId, err);
    return null;
  }
}

/**
 * Записывает ответ ассистента под заранее выданным id. Ошибка только логируется.
 *
 * contextSlugs — записи каталога, попавшие в контекст ответа. Они сохраняются
 * вместе с сообщением, чтобы в открытом заново диалоге ссылки на каталог
 * снова были кликабельными.
 *
 * meta — режим работы, источники из интернета, вопросы для кнопок и записи
 * каталога. Сохраняются рядом с ответом, чтобы в открытом заново диалоге
 * осталась пометка о режиме, список ссылок, кнопки и карточки каталога.
 */
export async function saveAssistantTurn(
  db: DatabaseClient,
  requestId: string,
  conversationId: string,
  messageId: string,
  content: string,
  contextSlugs: string[] = [],
  meta?: {
    mode?: string;
    sources?: SourceRow[];
    followUps?: string[];
    related?: RelatedRow[];
  }
): Promise<void> {
  if (!content.trim()) return;
  try {
    await queries.addMessage(
      db,
      conversationId,
      "assistant",
      content,
      messageId,
      contextSlugs,
      meta
    );
  } catch (err) {
    logFailure("chat-history", requestId, err);
  }
}
