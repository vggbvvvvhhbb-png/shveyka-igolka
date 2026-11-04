/**
 * Состояние провайдера моделей.
 *
 * Бесплатный тариф APInex требует ежедневной проверки на их странице.
 * Когда проверки не было, провайдер отвечает 402, и цепочка моделей уходит
 * на платные: ответ получается, но идёт дольше и стоит денег. Раньше это
 * было видно только в логах сервера — человек видел медленный ответ и не
 * понимал почему.
 *
 * Теперь состояние живёт в процессе и показывается честно: и в ответе
 * помощника, и владельцу на странице входа.
 */

/** Состояние провайдера: что известно из последних запросов. */
export type ProviderStatus = {
  /** Свободные модели требуют ежедневной проверки. */
  checkInRequired: boolean;
  /** Когда провайдер потребовал проверку в последний раз. */
  checkInAt: number | null;
  /** Когда модель ответила в последний раз. */
  lastSuccessAt: number | null;
  /** Какая модель ответила последней. */
  lastModel: string | null;
  /** Последняя ошибка провайдера. */
  lastErrorModel: string | null;
  /** HTTP-статус последней ошибки. */
  lastErrorStatus: number | null;
};

const EMPTY: ProviderStatus = {
  checkInRequired: false,
  checkInAt: null,
  lastSuccessAt: null,
  lastModel: null,
  lastErrorModel: null,
  lastErrorStatus: null,
};

/**
 * Состояние живёт в globalThis: при горячей перезагрузке Next.js модуль
 * пересоздаётся, а сведения о провайдере терять нельзя.
 */
const g = globalThis as unknown as { __shveykaProviderStatus?: ProviderStatus };

function state(): ProviderStatus {
  g.__shveykaProviderStatus ??= { ...EMPTY };
  return g.__shveykaProviderStatus;
}

/** Модель бесплатного тарифа: у неё в названии префикс `free/`. */
export function isFreeModel(model: string): boolean {
  return model.startsWith("free/");
}

/** Провайдер попросил ежедневную проверку бесплатных моделей. */
export function noteCheckInRequired(model: string): void {
  const current = state();
  current.checkInRequired = true;
  current.checkInAt = Date.now();
  current.lastErrorModel = model;
  current.lastErrorStatus = 402;
}

/** Модель ответила: состояние провайдера обновлено. */
export function noteProviderSuccess(model: string): void {
  const current = state();
  current.lastSuccessAt = Date.now();
  current.lastModel = model;
  current.lastErrorModel = null;
  current.lastErrorStatus = null;
  // Ответила свободная модель — значит, проверка уже пройдена.
  if (isFreeModel(model)) {
    current.checkInRequired = false;
    current.checkInAt = null;
  }
}

/** Провайдер ответил ошибкой. */
export function noteProviderFailure(model: string, status: number | null): void {
  const current = state();
  current.lastErrorModel = model;
  current.lastErrorStatus = status;
}

/** Текущее состояние провайдера. */
export function providerStatus(): ProviderStatus {
  return { ...state() };
}

/**
 * Что сказать человеку про состояние бесплатных моделей.
 *
 * Текст короткий и конкретный: причина, следствие и что делать.
 */
export function freeModelsNotice(status: ProviderStatus = providerStatus()): string | null {
  if (!status.checkInRequired) return null;
  const when = status.checkInAt ? new Date(status.checkInAt) : null;
  const time = when
    ? `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`
    : null;
  return time
    ? `Бесплатные модели сегодня не проверены (проверка нужна была в ${time}). Ответ дала платная модель — он мог идти дольше обычного.`
    : "Бесплатные модели сегодня не проверены. Ответ дала платная модель — он мог идти дольше обычного.";
}

/**
 * Разбор состояния для страницы владельца.
 *
 * Строки отвечают на вопрос «почему режимы с интернетом работают так»:
 * видно и настройку ключей, и то, что провайдер требует проверки.
 */
export function describeProviderStatus(status: ProviderStatus = providerStatus()): {
  label: string;
  value: string;
  ok: boolean;
}[] {
  const rows: { label: string; value: string; ok: boolean }[] = [];

  rows.push({
    label: "Последний ответ",
    value: status.lastModel
      ? `${status.lastModel}${status.lastSuccessAt ? `, ${formatTime(status.lastSuccessAt)}` : ""}`
      : "пока не было",
    ok: Boolean(status.lastModel),
  });

  if (status.checkInRequired) {
    rows.push({
      label: "Бесплатные модели",
      value: `требуют ежедневной проверки${status.checkInAt ? ` (с ${formatTime(status.checkInAt)})` : ""} — ответы уходят на платные модели`,
      ok: false,
    });
  } else {
    rows.push({
      label: "Бесплатные модели",
      value:
        status.lastModel && isFreeModel(status.lastModel) ? "отвечают" : "проверка не требовалась",
      ok: true,
    });
  }

  if (status.lastErrorModel) {
    rows.push({
      label: "Последняя ошибка",
      value: `${status.lastErrorModel}${
        status.lastErrorStatus ? `, код ${status.lastErrorStatus}` : ""
      }`,
      ok: false,
    });
  }

  return rows;
}

/** Время в часах и минутах. */
function formatTime(at: number): string {
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
