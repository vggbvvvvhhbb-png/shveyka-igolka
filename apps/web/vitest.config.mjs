import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // JSX в тестах обрабатывается автоматическим рантаймом React.
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Маршрут перезагружается перед каждым тестом: модуль импортируется
    // заново много раз подряд. Все пакеты тестируются параллельно, и под
    // нагрузкой один тест иногда не укладывается в стандартные 5 секунд.
    // Запас по времени убирает случайные падения.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
