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
 * Пустая переменная считается незаданной: иначе пустой порт или пустой
 * адрес получателя ломают отправку молча.
 *
 * Если SMTP не настроен, письма не уходят: обращение всё равно сохраняется
 * в базе, а человек получает честный ответ — что форма сработала, но
 * письмо не отправлено.
 */

import nodemailer from "nodemailer";

/** Почта, куда приходят обращения. */
const CONTACT_EMAIL = process.env.CONTACT_EMAIL?.trim() || "vggbvvvvhhbb@gmail.com";

/** Сервер отправки писем. */
const SMTP_HOST = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";

/** Порт отправки писем. */
const SMTP_PORT = Number(process.env.SMTP_PORT?.trim() || 465) || 465;

/** Почта отправителя. */
const SMTP_USER = process.env.SMTP_USER?.trim() || "";

/** Пароль приложения. */
const SMTP_PASS = process.env.SMTP_PASS?.trim() || "";

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
  return SMTP_USER.length > 0 && SMTP_PASS.length > 0;
}

/** Куда приходят обращения. */
export function contactEmail(): string {
  return CONTACT_EMAIL;
}

/**
 * Чего не хватает для отправки писем.
 *
 * Возвращаются только имена переменных, без значений: в лог попадает,
 * что именно не задано, а сам пароль — никогда.
 */
export function mailMissingEnv(): string[] {
  const missing: string[] = [];
  if (SMTP_USER.length === 0) missing.push("SMTP_USER");
  if (SMTP_PASS.length === 0) missing.push("SMTP_PASS");
  return missing;
}

/**
 * Отправляет письмо.
 *
 * Возвращает true, если письмо ушло. Ошибка не выбрасывается: письмо —
 * часть обращения, и если отправка не получилась, об этом честно
 * сообщают человеку, а не прячут.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (!mailConfigured()) {
    // Без этого сообщения в логах нет ни слова о причине: диагностика
    // письма упирается в догадки.
    console.error("[mail] отправка не настроена, письмо не отправлено", {
      missing: mailMissingEnv(),
    });
    return false;
  }
  try {
    await transporter().sendMail({
      from: SMTP_USER,
      to: CONTACT_EMAIL,
      subject: message.subject,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    console.info("[mail] письмо отправлено", { to: CONTACT_EMAIL });
    return true;
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    // Код ошибки nodemailer (EAUTH, ECONNECTION…) — по нему видно, что
    // именно сломалось: пароль, сеть или сервер.
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code ?? "")
        : "";
    console.error("[mail] письмо не отправлено", { name, code });
    return false;
  }
}

/** Похоже ли на почту, по ней можно ответить прямо из письма. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
