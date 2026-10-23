import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
// Файл .env лежит в корне репозитория, а скрипт запускается из пакета db.
dotenvConfig({ path: resolve(process.cwd(), "../../.env") });
import { closeDbPool, getDbSingleton } from "../client";
import { listRecentDownvotes } from "../queries/feedback";

const PREVIEW = 240;

/** Печатает последние ответы с оценкой «не то»: вопрос, контекст и комментарий. */
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const limit = Number(process.argv[2]) || 20;
  const items = await listRecentDownvotes(getDbSingleton(), limit);

  if (items.length === 0) {
    console.log("Неудачных ответов пока нет.");
    return;
  }

  for (const item of items) {
    console.log(`\n— ${item.createdAt.toISOString()}  (диалог ${item.conversationId})`);
    console.log(`Вопрос:   ${item.question ?? "—"}`);
    console.log(`Контекст: ${item.contextSlugs.join(", ") || "пустой — каталог ничего не нашёл"}`);
    console.log(`Ответ:    ${item.answer.slice(0, PREVIEW).replace(/\s+/g, " ")}`);
    if (item.comment) console.log(`Комментарий: ${item.comment}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error("Не удалось построить отчёт:", err instanceof Error ? err.name : err);
    process.exitCode = 1;
  })
  .finally(() => closeDbPool());
