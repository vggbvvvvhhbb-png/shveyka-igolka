/**
 * Админ-бот: отчёты о расходе токенов.
 *
 * Бот читает таблицу `ai_usage`, куда сайт и обычный бот записывают каждый
 * обращённый к помощнику запрос. Здесь владелец смотрит, кто спрашивал,
 * чем именно пользовался и сколько токенов на это ушло.
 *
 * Отчёт собирается чистыми функциями (report.ts), поэтому тексты
 * проверяются тестами без базы и без Telegram.
 */

import { Bot, GrammyError, HttpError, InputFile } from "grammy";
import { queries, type DatabaseClient } from "@shveyka/db";
import { config } from "./config";
import { OwnerStore } from "./owner";
import { periodRange, parsePeriod, type Period } from "./periods";
import { buildCsv, buildReport, buildUserReport, estimateCost } from "./report";

/** Что нужно боту для работы. */
export interface AdminBotDeps {
  /** База с расходом. */
  db: DatabaseClient;
  /** Кто владелец: его чат хранится в файле. */
  owner: OwnerStore;
  /** Час ежедневного отчёта по московскому времени. */
  reportHour: number;
  /** Цена миллиона токенов в рублях: 0 — деньги не считаем. */
  pricePerMillion: number;
  /** Адрес сайта: нужен для проверки, что он отвечает. */
  siteUrl: string;
}

/** Текст помощи. */
export const HELP_TEXT = [
  "Команды:",
  "/report — отчёт за сегодня (можно /report неделя, /report месяц)",
  "/week — отчёт за 7 дней",
  "/month — отчёт за 30 дней",
  "/user <id> — расход одного человека (например /user tg:12345)",
  "/top — кто потратил больше всех за неделю",
  "/modes — чем пользовались за неделю",
  "/export — выгрузка в CSV за неделю",
  "/health — проверка сайта и базы",
  "/ping — бот на связи",
].join("\n");

/** Текст при первом запуске. */
export const WELCOME_TEXT = [
  "Админ-бот Швейки готов.",
  "",
  "Здесь отчёты: кто спрашивал помощника, чем пользовался и сколько токенов ушло.",
  "Каждый день в 21:00 по Москве приходит отчёт за день.",
  "",
  HELP_TEXT,
].join("\n");

/** Собирает бота. */
export function createAdminBot(token: string, deps: AdminBotDeps): Bot {
  const bot = new Bot(token);

  // ---------- Доступ только для владельца ----------
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const known = deps.owner.read() ?? config.ownerChatId;
    if (!known) {
      // Владелец ещё не определён: первый, кто написал, становится им.
      deps.owner.write(chatId);
      await next();
      return;
    }
    if (chatId !== known) {
      await ctx.reply("Этот бот приватный 🔒").catch(() => undefined);
      return;
    }
    await next();
  });

  // ---------- Команды ----------
  bot.command("start", (ctx) => ctx.reply(WELCOME_TEXT));
  bot.command("help", (ctx) => ctx.reply(HELP_TEXT));
  bot.command("ping", (ctx) => ctx.reply("Бот на связи."));

  bot.command(["report", "today"], async (ctx) => {
    const period = parsePeriod(ctx.match);
    await sendReport(ctx, period, deps);
  });

  bot.command("week", async (ctx) => {
    await sendReport(ctx, "week", deps);
  });

  bot.command("month", async (ctx) => {
    await sendReport(ctx, "month", deps);
  });

  bot.command("top", async (ctx) => {
    const range = periodRange("week");
    const users = await queries.usageTopUsers(deps.db, range, 10);
    if (users.length === 0) {
      await ctx.reply("За неделю запросов не было.");
      return;
    }
    const lines = ["Кто потратил за 7 дней:"];
    for (const row of users) {
      const label = row.userLabel ? `${row.userLabel} (${row.userKey})` : row.userKey;
      lines.push(`• ${label} — ${row.requests} запросов, ${row.totalTokens} токенов`);
    }
    await ctx.reply(lines.join("\n"));
  });

  bot.command("modes", async (ctx) => {
    const range = periodRange("week");
    const rows = await queries.usageByFeature(deps.db, range);
    if (rows.length === 0) {
      await ctx.reply("За неделю запросов не было.");
      return;
    }
    const lines = ["Чем пользовались за 7 дней:"];
    for (const row of rows) {
      lines.push(`• ${row.feature} — ${row.requests} запросов, ${row.totalTokens} токенов`);
    }
    await ctx.reply(lines.join("\n"));
  });

  bot.command("user", async (ctx) => {
    const query = (ctx.match ?? "").trim();
    if (!query) {
      await ctx.reply("Укажите идентификатор: /user tg:12345");
      return;
    }
    const range = periodRange("week");

    // Сначала точное совпадение: ключ может прийти с префиксом или без него.
    const candidates = [query, `tg:${query}`, `web:${query}`];
    for (const key of candidates) {
      const found = await queries.usageForUser(deps.db, key, range);
      if (found.totals.requests > 0) {
        const label = found.recent[0]?.userLabel ?? null;
        await ctx.reply(
          buildUserReport({
            userKey: key,
            userLabel: label,
            title: range.title,
            totals: found.totals,
            byFeature: found.byFeature,
            recent: found.recent,
          })
        );
        return;
      }
    }

    // Не нашли: показываем похожих.
    const found = await queries.findUsers(deps.db, query, 5);
    if (found.length === 0) {
      await ctx.reply(`По запросу «${query}» ничего не нашёл.`);
      return;
    }
    const lines = [`Похожие пользователи:`];
    for (const row of found) {
      const label = row.userLabel ? `${row.userLabel} (${row.userKey})` : row.userKey;
      lines.push(`• ${label} — ${row.requests} запросов, ${row.totalTokens} токенов`);
    }
    lines.push("");
    lines.push("Уточните: /user <id>");
    await ctx.reply(lines.join("\n"));
  });

  bot.command("export", async (ctx) => {
    const range = periodRange("week");
    const rows = await queries.recentUsage(deps.db, range, 200);
    if (rows.length === 0) {
      await ctx.reply("За неделю запросов не было.");
      return;
    }
    const csv = buildCsv(rows);
    const file = new InputFile(Buffer.from(csv, "utf8"), "usage.csv");
    await ctx.replyWithDocument(file, {
      caption: `Расход за 7 дней: ${rows.length} запросов.`,
    });
  });

  bot.command("health", async (ctx) => {
    const lines: string[] = [];
    try {
      const totals = await queries.usageTotals(deps.db, periodRange("day"));
      lines.push(`База: отвечает, запросов сегодня ${totals.requests}.`);
    } catch (err) {
      lines.push(`База: не отвечает (${err instanceof Error ? err.name : "ошибка"}).`);
    }
    if (deps.siteUrl) {
      try {
        const res = await fetch(`${deps.siteUrl}/api/catalog`, {
          signal: AbortSignal.timeout(8000),
        });
        lines.push(`Сайт: ${res.ok ? "отвечает" : `ошибка ${res.status}`}.`);
      } catch {
        lines.push("Сайт: не отвечает.");
      }
    }
    await ctx.reply(lines.join("\n"));
  });

  // ---------- Ошибки ----------
  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) console.error("[admin] ошибка Telegram API", e.description);
    else if (e instanceof HttpError) console.error("[admin] нет связи с Telegram", e);
    else console.error("[admin] ошибка в боте", e);
    err.ctx.reply("Что-то пошло не так 😕 Попробуйте ещё раз: /report").catch(() => undefined);
  });

  return bot;
}

/** Собирает и отправляет отчёт за период. */
async function sendReport(
  ctx: { reply: (text: string) => Promise<unknown> },
  period: Period,
  deps: AdminBotDeps
): Promise<void> {
  const range = periodRange(period);
  const [totals, byFeature, bySource, topUsers] = await Promise.all([
    queries.usageTotals(deps.db, range),
    queries.usageByFeature(deps.db, range),
    queries.usageBySource(deps.db, range),
    queries.usageTopUsers(deps.db, range, 10),
  ]);

  const cost = estimateCost(totals.totalTokens, deps.pricePerMillion);
  const text = buildReport({
    title: range.title,
    totals,
    byFeature,
    bySource,
    topUsers,
    cost,
  });
  await ctx.reply(text);
}
