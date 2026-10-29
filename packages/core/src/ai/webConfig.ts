/**
 * Настройка режимов с интернетом.
 *
 * Режимы «Поиск», «Рассуждение» и «Ресёрч» работают через две внешние
 * службы: поиск в интернете и ответы моделей. Без ключей они не работают
 * вообще, поэтому проверка живёт в ядре: одинаково нужна маршруту и
 * диагностике.
 */

/** Переменные, без которых режимы с интернетом работать не будут. */
export const WEB_MODE_ENV = ["EXA_API_KEY", "APINEX_API_KEY"] as const;

/**
 * Каких переменных не хватает для режимов с интернетом.
 *
 * Возвращаются только имена переменных, без значений: в лог попадает, что
 * именно не настроено, а сам ключ туда не попадает никогда.
 */
export function missingWebModeEnv(env: Record<string, string | undefined> = process.env): string[] {
  return WEB_MODE_ENV.filter((name) => {
    const value = env[name];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

/** Настроены ли режимы с интернетом на сервере. */
export function webModesConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return missingWebModeEnv(env).length === 0;
}
