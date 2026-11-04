/**
 * Отправка писем с сайта.
 *
 * Письма уходят через обычную почту (SMTP), а не через сторонний сервис:
 * так владелец получает обращения в свой ящик, без посредников.
 *
 * Настройки берутся из переменных окружения:
 *
 *   SMTP_HOST     — сервер отправки, по умолчанию smtp.gmail.com
 *   SMTP_PORT     — порт, по умолчанию 465
 *   SMTP_USER     — почта отправителя (для Gmail это почта владельца)
 *   SMTP_PASS     — пароль приложения (для Gmail — код приложения)
 *   CONTACT_EMAIL — куда приходят обращения
 *
 * Если SMTP не настроен, письма не уходят: обращение всё равно сохраняется
 * в базе, а человек получает подсказку, куда написать самому.
 */

import nodemailer from "nodemailer";

/** Почта, куда уходят обращения. */
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "vggbvvvvhhbb@gmail.com";

/** Сервер отправки писем. */
const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";

/** Порт отправки писем. */
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);

/** Почта отправителя. */
const SMTP_USER = process.env.SMTP_USER ?? "";

/** Пароль приложения. */
const SMTP_PASS = process.env.SMTP_PASS ?? "";

/** Письмо. */
export interface MailMessage {
  /** Тема письма. */
  subject: string;
  /** Текст письма. */
  text: string;
  /** Куда писать в ответ, если человек оставил почту. */
  replyTo?: string;
}

type Transporter = ReturnType<typeof nodemailer.createTransport>;

const g = globalThis as unknown as { __shveykaMailer?: Transporter };

/** Транспорт для отправки: один на процесс, а не на каждое письмо. */
function transporter(): Transporter {
  if (g.__shveykaMailer) return g.__shveykaMailer;
  g.__shveykaMailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return g.__shveykaMailer;
}

/** Настроена ли отправка писем. */
export function mailConfigured(): boolean {
  return SMTP_USER.trim().length > 0 && SMTP_PASS.trim().length > 0;
}

/** Куда приходят обращения. */
export function contactEmail(): string {
  return CONTACT_EMAIL;
}

/**
 * Отправляет письмо.
 *
 * Возвращает true, если письмо ушло. Ошибка не выбрасывается: письмо —
 * часть обращения, и если отправка не получилась, об этом честно
 * сообщают человеку, а не прячут.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    await transporter().sendMail({
      from: SMTP_USER,
      to: CONTACT_EMAIL,
      subject: message.subject,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    return true;
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.error("[mail] письмо не отправлено", { name });
    return false;
  }
}

/** Похоже ли на почту, по ней можно ответить прямо из письма. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
