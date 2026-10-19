/**
 * Подготовка типов Next.js перед проверкой типов.
 *
 * Next.js генерирует типы маршрутов в `.next/types` при сборке. После
 * переключения ветки там остаются файлы для маршрутов, которых в текущей
 * ветке больше нет, — и `tsc --noEmit` падает на них с TS2307.
 *
 * Поэтому перед проверкой:
 *   1. перегенерируем общие типы маршрутов (`next typegen`) — без них
 *      ссылка из next-env.d.ts на .next/types/routes.d.ts не разрешается;
 *   2. удаляем сгенерированные типы отдельных маршрутов — они всё равно
 *      создаются заново при `next build`, который и проверяет их сам.
 */

import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Команда фиксированная, пользовательский ввод сюда не попадает.
execSync("next typegen", { cwd: packageRoot, stdio: "inherit" });

rmSync(join(packageRoot, ".next", "types", "app"), { recursive: true, force: true });
