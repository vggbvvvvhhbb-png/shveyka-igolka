// ============================================================================
// ТИПЫ ДИАЛОГОВ
// ============================================================================

/** Роль сообщения в диалоге. */
export type ConversationRole = "user" | "assistant";

/** Диалог в том виде, в котором его отдаёт API. */
export type Conversation = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

/** Сообщение диалога в том виде, в котором его отдаёт API. */
export type ConversationMessage = {
  id: string;
  conversation_id: string;
  role: ConversationRole;
  content: string;
  created_at: string;
};
