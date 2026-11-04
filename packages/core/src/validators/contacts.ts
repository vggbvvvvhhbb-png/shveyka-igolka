import {
  CONTACT_TOPICS,
  ContactRequestSchema,
  type ContactRequestInput,
  type ContactTopic,
} from "../schemas/contacts";

/** Разобранное обращение. */
export type ContactRequestValidation =
  | { ok: true; value: ContactRequestInput }
  | { ok: false; error: string };

/**
 * Проверяет тело запроса формы обращений.
 *
 * Схема отвечает за формат, а здесь разбираются вещи, которые схема не ловит:
 * пустые необязательные поля и слишком длинный текст без всякой логики.
 */
export function validateContactRequest(body: unknown): ContactRequestValidation {
  if (!body || typeof body !== "object") return { ok: false, error: "Некорректный запрос" };
  const raw = body as Record<string, unknown>;

  const parsed = ContactRequestSchema.safeParse({
    topic: raw.topic,
    name: raw.name,
    contact: raw.contact,
    message: raw.message,
    page: raw.page,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Некорректный запрос" };
  }

  const value = parsed.data;

  // Тема приходит строкой: неизвестное значение молча превращать в «Другое»
  // нельзя — человек описал проблему, а письмо ушло бы с чужой темой.
  if (!CONTACT_TOPICS.includes(value.topic as ContactTopic)) {
    return { ok: false, error: "Выберите тему обращения" };
  }

  // Пустые необязательные поля убираем: в письме они не нужны.
  const cleaned: ContactRequestInput = {
    topic: value.topic,
    message: value.message,
    ...(value.name ? { name: value.name } : {}),
    ...(value.contact ? { contact: value.contact } : {}),
    ...(value.page ? { page: value.page } : {}),
  };

  return { ok: true, value: cleaned };
}
