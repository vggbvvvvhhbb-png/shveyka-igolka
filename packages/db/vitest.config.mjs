/** @type {import('vitest/config').UserConfig} */
export default {
  test: {
    globals: true,
    environment: "node",
    // Каждый файл тестов поднимает свой PGlite (Postgres в WASM). Файлов много,
    // и они идут параллельно, поэтому запуск базы под нагрузкой иногда дольше
    // стандартных 10 секунд. Запас по времени убирает случайные падения.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
};
