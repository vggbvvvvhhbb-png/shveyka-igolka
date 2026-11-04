/**
 * Настройка режимов с интернетом.
 *
 * Режимы «Поиск», «Рассуждение» и «Ресёрч» работают через две внешние
 * службы: поиск в интернете (Exa) и ответы моделей (APInex). Ключи у них
 * разные, и без ключа поиска режим всё равно отвечает — по каталогу.
 * Поэтому проверка живёт в ядре и разбирает службы по отдельности:
 * одинаково нужна маршруту и диагностике владельца.
 */

/** Службы режимов с интернетом и переменные с их ключами. */
export const WEB_SERVICES = {
  /** Поиск страниц в интернете. */
  search: "EXA_API_KEY",
  /** Ответы моделей. */
  llm: "APINEX_API_KEY",
} as const;

/** Имя службы. */
export type WebService = keyof typeof WEB_SERVICES;

/** Состояние службы: ключ задан или нет. */
export type WebServiceState = "ready" | "missing";

/** Разбор настроек режимов с интернетом. */
export type WebServicesStatus = {
  /** Поиск в интернете. */
  search: WebServiceState;
  /** Ответы моделей. */
  llm: WebServiceState;
  /** Чего не хватает: имена переменных, без значений. */
  missing: string[];
};

/** Человеческие названия служб: для страницы владельца и логов. */
export const WEB_SERVICE_LABELS: Record<WebService, string> = {
  search: "Поиск в интернете (Exa)",
  llm: "Модели (APInex)",
};

/** Значение переменной считается заданным, если в нём есть непустой текст. */
function hasKey(env: Record<string, string | undefined>, name: string): boolean {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Разбор настроек режимов с интернетом.
 *
 * Значения ключей не возвращаются: в лог и на страницу попадают только
 * имена переменных и состояние службы.
 */
export function webServicesStatus(
  env: Record<string, string | undefined> = process.env
): WebServicesStatus {
  const search: WebServiceState = hasKey(env, WEB_SERVICES.search) ? "ready" : "missing";
  const llm: WebServiceState = hasKey(env, WEB_SERVICES.llm) ? "ready" : "missing";
  const missing = (Object.keys(WEB_SERVICES) as WebService[])
    .filter((service) => (service === "search" ? search : llm) === "missing")
    .map((service) => WEB_SERVICES[service]);

  return { search, llm, missing };
}

/**
 * Каких переменных не хватает для режимов с интернетом.
 *
 * Возвращаются только имена переменных, без значений: в лог попадает, что
 * именно не настроено, а сам ключ туда не попадает никогда.
 */
export function missingWebModeEnv(env: Record<string, string | undefined> = process.env): string[] {
  return webServicesStatus(env).missing;
}

/**
 * Настроены ли режимы с интернетом полностью.
 *
 * Без ключа поиска режим работать не будет: источники из интернета — его
 * половина. Без ключа моделей режим ответить не может вовсе.
 */
export function webModesConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const status = webServicesStatus(env);
  return status.search === "ready" && status.llm === "ready";
}

/**
 * Может ли режим с интернетом ответить.
 *
 * Ответ без интернета — это ответ по каталогу: он возможен и полезен.
 * Ответ без модели невозможен, поэтому без ключа моделей режим выключен
 * целиком.
 */
export function webModeCanAnswer(env: Record<string, string | undefined> = process.env): boolean {
  return webServicesStatus(env).llm === "ready";
}

/**
 * Разбор настроек для показа человеку.
 *
 * Каждая строка отвечает на один вопрос: «какая служба нужна и готова ли
 * она». Значения ключей в строки не попадают.
 */
export function describeWebServices(
  status: WebServicesStatus = webServicesStatus()
): { label: string; state: WebServiceState; text: string }[] {
  return (Object.keys(WEB_SERVICES) as WebService[]).map((service) => ({
    label: WEB_SERVICE_LABELS[service],
    state: status[service],
    text:
      status[service] === "ready"
        ? "ключ задан"
        : service === "search"
          ? "ключ не задан — режим ответит только по каталогу"
          : "ключ не задан — режим не ответит вовсе",
  }));
}
