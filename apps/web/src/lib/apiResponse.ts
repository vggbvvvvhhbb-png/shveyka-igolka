import { NextResponse } from "next/server";
import { buildErrorResponse, createRequestId } from "@shveyka/core";

/**
 * Ответ с ошибкой в едином формате: обобщённый текст и идентификатор запроса.
 * Идентификатор возвращается клиенту, чтобы пользователь мог назвать его при
 * обращении.
 */
export function errorResponse(message: string, status: number, requestId: string): NextResponse {
  return NextResponse.json(buildErrorResponse(message, requestId), { status });
}

/**
 * Ответ с ошибкой и новым идентификатором запроса — для случаев, когда
 * идентификатор ещё не был создан.
 */
export function errorResponseWithId(message: string, status: number): NextResponse {
  return errorResponse(message, status, createRequestId());
}

/**
 * Запись об ошибке в лог. В лог попадает только имя ошибки и идентификатор
 * запроса — без стектрейса и без содержимого запроса.
 */
export function logFailure(scope: string, requestId: string, err: unknown): void {
  const name = err instanceof Error ? err.name : "unknown";
  console.error(`[${scope}] request failed`, { requestId, name });
}
