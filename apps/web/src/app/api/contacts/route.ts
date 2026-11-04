import { NextResponse } from "next/server";
import { CONTACT_TOPIC_LABELS, validateContactRequest } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { clientIp, limitRequest } from "@/lib/guard";
import { looksLikeEmail, sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось отправить обращение, попробуйте позже";

/**
 * Лимит формы обращений: 5 заявок в минуту с одного адреса.
 *
 * Формой пользуются редко, а вот спамеры любят такие формы. Пять заявок
 * в минуту — это и живому человеку хватает, и перебор не проходит.
 */
const FORM_RATE_LIMIT = 5;

/** Собирает текст письма по обращению. */
function buildMailText(input: {
  topic: string;
  name?: string;
  contact?: string;
  message: string;
  page?: string;
}): string {
  const topic =
    CONTACT_TOPIC_LABELS[input.topic as keyof typeof CONTACT_TOPIC_LABELS] ?? input.topic;
  const lines = [
    `Тема: ${topic}`,
    `Имя: ${input.name ?? "—"}`,
    `Связь: ${input.contact ?? "—"}`,
    `Страница: ${input.page ?? "—"}`,
    `Дата: ${new Date().toISOString()}`,
    "",
    input.message,
  ];
  return lines.join("\n");
}

/**
 * POST /api/contacts — обращение через форму.
 *
 * Обращение сначала сохраняется в базе, потом уходит письмом. Так оно не
 * теряется, даже если почта не настроена или письмо не дошло.
 */
export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const limited = await limitRequest(req, {
    key: `contacts:${clientIp(req)}`,
    limit: FORM_RATE_LIMIT,
    requestId,
    message: "Слишком много обращений, подождите минуту",
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Некорректный запрос", 400, requestId);
  }

  const validated = validateContactRequest(body);
  if (!validated.ok) return errorResponse(validated.error, 400, requestId);

  try {
    const db = getDbSingleton();
    const saved = await queries.saveContactRequest(db, validated.value);

    const emailed = await sendMail({
      subject: `Швейка: обращение — ${CONTACT_TOPIC_LABELS[saved.topic]}`,
      text: buildMailText(validated.value),
      ...(validated.value.contact && looksLikeEmail(validated.value.contact)
        ? { replyTo: validated.value.contact }
        : {}),
    });

    if (emailed) {
      await queries.markContactEmailed(db, saved.id);
    }

    return NextResponse.json({ ok: true, emailed });
  } catch (err) {
    logFailure("contacts", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
