import { z } from "zod";

/**
 * Обращение через форму на сайте: предложение, жалоба или вопрос владельцу.
 *
 * Тема выбирается из списка, а не пишется свободно: так письма можно
 * разбирать по полкам без разбора текста.
 */
export const CONTACT_TOPICS = ["suggestion", "problem", "bug", "question", "other"] as const;

/** Тема обращения. */
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** Человеческие названия тем — их показывает форма и письмо. */
export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  suggestion: "Предложение",
  problem: "Жалоба",
  bug: "Ошибка на сайте",
  question: "Вопрос",
  other: "Другое",
};

/** Схема обращения. */
export const ContactRequestSchema = z.object({
  /** Тема обращения. */
  topic: z.enum(CONTACT_TOPICS, { errorMap: () => ({ message: "Выберите тему обращения" }) }),
  /** Как обращаться к человеку. Не обязательно. */
  name: z.string().trim().max(80, "Имя длиннее 80 символов").optional(),
  /** Почта или телеграм для ответа. Не обязательна. */
  contact: z.string().trim().max(120, "Способ связи длиннее 120 символов").optional(),
  /** Текст обращения. */
  message: z
    .string()
    .trim()
    .min(10, "Напишите хотя бы 10 символов")
    .max(4000, "Текст длиннее 4000 символов"),
  /** Откуда пришло обращение: страница сайта. */
  page: z.string().trim().max(200).optional(),
});

export type ContactRequestInput = z.infer<typeof ContactRequestSchema>;
