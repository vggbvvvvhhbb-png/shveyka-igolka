import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"], {
    errorMap: () => ({ message: "Роль должна быть user или assistant" }),
  }),
  content: z.string().min(1, "Сообщение пустое").max(1000, "Сообщение длиннее 1000 символов"),
});

export const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1, "Нет сообщений")
    .max(10, "Слишком длинная история, максимум 10 сообщений"),
  /** Страница каталога, на которой задан вопрос: `fabric/<slug>`. */
  ctx: z.string().max(100).optional(),
  /** Режим ответа: коротко, по шагам или почему. */
  mode: z.string().max(10).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
