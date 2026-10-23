import { NextResponse } from "next/server";
import { createRequestId, isUuid } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { createGuard } from "@/lib/guard";

export const dynamic = "force-dynamic";

const allow = createGuard();

/** DELETE /api/conversations/:id — удалить диалог вместе с сообщениями. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const requestId = createRequestId();
  if (!allow(req)) return errorResponse("Слишком много запросов, подождите минуту", 429, requestId);

  const { id } = await params;
  if (!isUuid(id)) return errorResponse("Диалог не найден", 404, requestId);

  try {
    const deleted = await queries.deleteConversation(getDbSingleton(), id);
    if (!deleted) return errorResponse("Диалог не найден", 404, requestId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    logFailure("conversations", requestId, err);
    return errorResponse("Не удалось удалить диалог, попробуйте позже", 500, requestId);
  }
}
