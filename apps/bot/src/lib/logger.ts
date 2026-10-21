/**
 * Простой логгер: короткие строки с временем, без лишних зависимостей.
 */

const stamp = (): string => new Date().toLocaleTimeString("ru-RU", { hour12: false });

/** Приводит ошибку к короткому описанию. */
const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const logger = {
  info: (message: string): void => {
    console.log(`[${stamp()}] ${message}`);
  },
  error: (message: string, error?: unknown): void => {
    const tail = error === undefined ? "" : ` — ${describe(error)}`;
    console.error(`[${stamp()}] ${message}${tail}`);
  },
};
