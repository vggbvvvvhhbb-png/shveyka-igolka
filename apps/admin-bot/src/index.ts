/**
 * Точка входа админ-бота.
 *
 * Бот работает обычным long polling: секретный токен приходит из
 * окружения, в образ не копируется.
 */

import { getDbSingleton, queries } from "@shveyka/db";
import { createAdminBot } from "./bot";
import { config } from "./config";
import { OwnerStore } from "./owner";
import { nextReportTime, periodRange } from "./periods";
import { buildReport, estimateCost } from "./report";

async function main(): Promise<void> {
  if (!config.token) {
    console.error("[admin] не задан ADMIN_BOT_TOKEN — бот не запущен");
    process.exit(1);
  }
  if (!config.databaseUrl) {
    console.error("[admin] не задан DATABASE_URL — отчёты работать не будут");
    process.exit(1);
  }

  const db = getDbSingleton(config.databaseUrl);
  const owner = new OwnerStore(config.dataDir);

  const bot = createAdminBot(config.token, {
    db,
    owner,
    reportHour: config.reportHour,
    pricePerMillion: config.pricePerMillion,
    siteUrl: config.siteUrl,
  });

  // Сообщение о запуске: владелец сразу видит, что бот поднялся.
  const ownerChatId = owner.read() ?? config.ownerChatId;
  if (ownerChatId) {
    await bot.api
      .sendMessage(ownerChatId, "Админ-бот Швейки запущен. Отчёты приходят вовремя.")
      .catch(() => undefined);
  }

  // start() не заканчивается, пока бот работает: ждать его — значит
  // не дойти до планировщика отчётов. Запускаем и идём дальше.
  void bot.start();

  console.info("[admin] бот запущен");

  // ---------- Ежедневный отчёт ----------
  const sendDailyReport = async (): Promise<void> => {
    const chatId = owner.read() ?? config.ownerChatId;
    if (!chatId) return;

    const range = periodRange("day");
    const [totals, byFeature, bySource, topUsers] = await Promise.all([
      queries.usageTotals(db, range),
      queries.usageByFeature(db, range),
      queries.usageBySource(db, range),
      queries.usageTopUsers(db, range, 10),
    ]);

    const text = buildReport({
      title: range.title,
      totals,
      byFeature,
      bySource,
      topUsers,
      cost: estimateCost(totals.totalTokens, config.pricePerMillion),
    });
    await bot.api.sendMessage(chatId, text).catch(() => undefined);
  };

  /**
   * Следующая отправка отчёта.
   *
   * Отчёт приходит в заданный час по московскому времени. Таймер ставится
   * на конкретный момент и пересоздаётся после отправки: так перезапуск
   * контейнера не сбивает расписание, а часы машины не решают, когда
   * отправлять.
   */
  const schedule = (): void => {
    const next = nextReportTime(config.reportHour);
    const delay = Math.max(1_000, next.getTime() - Date.now());
    console.info("[admin] следующий отчёт", next.toISOString());
    setTimeout(() => {
      void sendDailyReport()
        .catch((err) => console.error("[admin] отчёт не отправлен", err))
        .finally(schedule);
    }, delay);
  };
  schedule();

  const shutdown = (): void => {
    void bot.stop();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[admin] бот не запустился", err);
  process.exit(1);
});
