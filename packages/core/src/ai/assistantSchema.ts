/**
 * Схемы режимов работы помощника.
 *
 * Отдельный эндпоинт отвечает за «Поиск», «Рассуждение» и «Ресёрч»: в ответе
 * есть источники и ход работы, поэтому формат здесь не текстовый, а JSON.
 */

import { z } from "zod";
import { ANSWER_MODES } from "./modes";
import { WORK_MODES } from "./workModes";

/** Тело запроса режима работы. */
export const AssistantRequestSchema = z.object({
  /** Вопрос пользователя. */
  message: z.string().trim().min(1, "Вопрос пустой").max(1000, "Вопрос длиннее 1000 символов"),
  /** Режим работы: каталог, поиск, рассуждение или ресёрч. */
  mode: z.enum(WORK_MODES, {
    errorMap: () => ({ message: "Неизвестный режим работы" }),
  }),
  /** Режим ответа: коротко, по шагам или почему. */
  style: z
    .enum(ANSWER_MODES, {
      errorMap: () => ({ message: "Неизвестный режим ответа" }),
    })
    .optional(),
  /** Страница каталога, с которой пришёл вопрос: `fabric/<slug>`. */
  ctx: z.string().max(100).optional(),
});

export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

/** Источник в ответе. */
export const SourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  date: z.string().optional(),
});

/** Тело ответа режима работы. */
export const AssistantResponseSchema = z.object({
  /** Текст ответа. */
  answer: z.string(),
  /** Режим работы, в котором получен ответ. */
  mode: z.enum(WORK_MODES),
  /** Источники из интернета. */
  sources: z.array(SourceSchema),
  /** Ход работы: что помощник делал. */
  steps: z.array(z.string()),
  /** Модель, которая дала ответ. */
  model: z.string(),
  /** Что не удалось, если не удалось. */
  degraded: z.string().nullable(),
  /** Вопросы для кнопок под ответом. */
  followUps: z.array(z.string()).max(4).default([]),
  /** Записи каталога, попавшие в ответ: показываются карточками. */
  related: z
    .array(z.object({ label: z.string(), href: z.string() }))
    .max(8)
    .default([]),
  /** id диалога, если ответ сохранён в истории. */
  conversationId: z.string().nullable(),
  /** id сообщения, если ответ сохранён в истории. */
  messageId: z.string().nullable(),
});

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
