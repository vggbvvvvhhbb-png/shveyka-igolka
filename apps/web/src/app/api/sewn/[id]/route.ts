import { NextResponse } from "next/server";
import { createRequestId, isUuid } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { clientIp, limitRequest } from "@/lib/guard";

export const dynamic = "force-dynamic";

/** DELETE /api/sewn/:id — убрать вещь из журнала. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const requestId = createRequestId();
  const limited = await limitRequest(req, { key: `sewn:${clientIp(req)}`, requestId });
  if (limited) return limited;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse("Запись не найдена", 404, requestId);

  try {
    const deleted = await queries.deleteSewnItem(getDbSingleton(), id);
    if (!deleted) return errorResponse("Запись не найдена", 404, requestId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    logFailure("sewn", requestId, err);
    return errorResponse("Не удалось удалить запись, попробуйте позже", 500, requestId);
  }
}
