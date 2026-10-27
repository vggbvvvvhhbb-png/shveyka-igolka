import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
// Файл .env лежит в корне репозитория, а скрипт запускается из пакета db.
dotenvConfig({ path: resolve(process.cwd(), "../../.env") });
import { count } from "drizzle-orm";
import { closeDbPool, fabrics, getDbSingleton, projects, seams, withRetry } from "../index";

/**
 * Проверяет, что база доступна, а каталог на месте.
 *
 * Нужна деплою: главная страница статическая, поэтому контейнер может быть
 * «здоров», пока каталог не грузится — БД недоступна или пуста. Такой деплой
 * выглядит успешным, а сайт не работает. Проверка ломает деплой сразу.
 */
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const db = getDbSingleton();

  const [f, s, p] = await Promise.all([
    withRetry(() => db.select({ n: count() }).from(fabrics)),
    withRetry(() => db.select({ n: count() }).from(seams)),
    withRetry(() => db.select({ n: count() }).from(projects)),
  ]);

  const fabricsCount = f[0]?.n ?? 0;
  const seamsCount = s[0]?.n ?? 0;
  const projectsCount = p[0]?.n ?? 0;

  // Пустой каталог — это тоже поломка: сиды не залиты или база другая.
  if (fabricsCount === 0 || seamsCount === 0 || projectsCount === 0) {
    throw new Error(
      `Каталог пуст: тканей ${fabricsCount}, швов ${seamsCount}, проектов ${projectsCount}. Залейте сиды: pnpm seed`
    );
  }

  console.log(
    `База доступна: тканей ${fabricsCount}, швов ${seamsCount}, проектов ${projectsCount}.`
  );
}

main()
  .catch((err: unknown) => {
    console.error(
      "Проверка базы не пройдена:",
      err instanceof Error ? err.message || err.name : err
    );
    process.exitCode = 1;
  })
  .finally(() => closeDbPool());
