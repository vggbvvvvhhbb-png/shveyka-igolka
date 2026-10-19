/**
 * Единый формат ошибок для API.
 *
 * Клиент получает обобщённый текст и идентификатор запроса. По нему в логах
 * находится запись об ошибке, поэтому в ответе нет ни стектрейсов, ни
 * внутренних деталей.
 */

/** Тело ответа с ошибкой. */
export type ApiErrorResponse = {
  error: string;
  requestId: string;
};

/**
 * Идентификатор запроса. Клиент показывает его пользователю, чтобы по
 * конкретному обращению можно было найти запись в логах.
 */
export function createRequestId(): string {
  return crypto.randomUUID();
}

/** Тело ответа с ошибкой и её идентификатором. */
export function buildErrorResponse(message: string, requestId: string): ApiErrorResponse {
  return { error: message, requestId };
}
