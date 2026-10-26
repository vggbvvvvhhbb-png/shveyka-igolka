import { NextResponse } from "next/server";
import { buildYearStats, createRequestId, validateSewnInput } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { clientIp, limitRequest } from "@/lib/guard";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось обратиться к журналу, попробуйте позже";

/**
 * GET /api/sewn?year=2026 — вещи журнала и итоги года.
 * Год по умолчанию — текущий. Этим же пользуется бот для команды /year:
 * он читает только stats.
 */
export async function GET(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const raw = Number(new URL(req.url).searchParams.get("year"));
  const year =
    Number.isInteger(raw) && raw >= 2000 && raw <= 2100 ? raw : new Date().getUTCFullYear();

  try {
    const db = getDbSingleton();
    const items = await queries.listSewnItems(db);
    const stats = buildYearStats(items, year);

    const names = new Map(
      (await queries.listFabricsForMatch(db)).map((fabric) => [fabric.id, fabric.name])
    );
    const topFabrics = stats.topFabrics.map((f) => ({ ...f, name: names.get(f.slug) ?? f.slug }));

    return NextResponse.json({ items, stats: { ...stats, topFabrics } });
  } catch (err) {
    logFailure("sewn", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}

/** POST /api/sewn — записать сшитую вещь. */
export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const limited = await limitRequest(req, { key: `sewn:${clientIp(req)}`, requestId });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Некорректный запрос", 400, requestId);
  }

  const validated = validateSewnInput(body);
  if (!validated.ok) return errorResponse(validated.error, 400, requestId);

  try {
    const item = await queries.addSewnItem(getDbSingleton(), validated.value);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    logFailure("sewn", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
