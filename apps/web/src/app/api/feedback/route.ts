import { NextResponse } from "next/server";
import { createRequestId, validateFeedback } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { limitRequest, clientIp } from "@/lib/guard";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось сохранить оценку, попробуйте позже";

/** POST /api/feedback — оценить ответ помощника (повторная оценка заменяет прежнюю). */
export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const limited = await limitRequest(req, { key: `feedback:${clientIp(req)}`, requestId });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Некорректный запрос", 400, requestId);
  }

  const validated = validateFeedback(body);
  if (!validated.ok) return errorResponse(validated.error, 400, requestId);

  try {
    const saved = await queries.saveFeedback(getDbSingleton(), validated.value);
    if (!saved) return errorResponse("Сообщение не найдено", 404, requestId);
    return NextResponse.json({ rating: saved.rating });
  } catch (err) {
    logFailure("feedback", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
