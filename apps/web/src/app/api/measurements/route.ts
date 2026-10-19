import { NextResponse } from "next/server";
import { createRequestId, MeasurementsSchema } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось сохранить мерки, попробуйте позже";

/**
 * Мерки в том виде, в котором их отдаёт API: без полей id и updated_at.
 */
function toResponse(row: {
  bust: number | null;
  waist: number | null;
  hip: number | null;
  height: number | null;
}) {
  return {
    bust: row.bust ?? undefined,
    waist: row.waist ?? undefined,
    hip: row.hip ?? undefined,
    height: row.height ?? undefined,
  };
}

/** GET /api/measurements — текущие мерки. */
export async function GET(): Promise<Response> {
  const requestId = createRequestId();
  try {
    const db = getDbSingleton();
    const row = await queries.getMeasurements(db);

    return NextResponse.json({ measurements: row ? toResponse(row) : null });
  } catch (err) {
    logFailure("measurements", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}

/** PUT /api/measurements — сохранить мерки. */
export async function PUT(req: Request): Promise<Response> {
  const requestId = createRequestId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Некорректный запрос", 400, requestId);
  }

  const parsed = MeasurementsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Некорректные мерки", 400, requestId);
  }

  try {
    const db = getDbSingleton();
    const saved = await queries.saveMeasurements(db, parsed.data);

    return NextResponse.json({ measurements: toResponse(saved) });
  } catch (err) {
    logFailure("measurements", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
