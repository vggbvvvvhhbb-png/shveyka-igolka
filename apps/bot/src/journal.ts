import type { Bot, Context } from "grammy";
import { SEWN_COMMAND_USAGE, parseSewnCommand } from "@shveyka/core";

const REQUEST_TIMEOUT_MS = 8000;
const UNAVAILABLE = "Сайт сейчас недоступен, попробуйте позже.";
const money = new Intl.NumberFormat("ru-RU");

interface YearStatsResponse {
  stats: {
    year: number;
    count: number;
    totalCost: number;
    totalSaved: number;
    pricedCount: number;
    giftCount: number;
    giftSpent: number;
    topFabrics: { slug: string; name: string; count: number }[];
  };
}

/**
 * Команды журнала шитья, общие с сайтом: бот пишет в тот же журнал через API.
 *
 *   /sewn название; затраты; цена в магазине; ткань — записать вещь
 *   /year — итоги года
 *
 * apiBase — адрес сайта изнутри docker-сети, например http://web:3000.
 */
export function registerJournal<C extends Context>(bot: Bot<C>, apiBase: string): void {
  const base = apiBase.replace(/\/+$/, "");

  bot.command("sewn", async (ctx) => {
    const parsed = parseSewnCommand(String(ctx.match ?? ""));
    if (!parsed.ok) {
      await ctx.reply(`${parsed.error}\n\n${SEWN_COMMAND_USAGE}`);
      return;
    }

    try {
      const res = await fetch(`${base}/api/sewn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        await ctx.reply(data?.error ?? "Не удалось записать, попробуйте позже.");
        return;
      }
      const saved =
        parsed.value.marketPrice !== null ? parsed.value.marketPrice - parsed.value.cost : null;
      await ctx.reply(
        `Записано: ${parsed.value.name}, ${money.format(parsed.value.cost)} ₽.` +
          (saved !== null ? ` Экономия ${money.format(saved)} ₽.` : "")
      );
    } catch {
      await ctx.reply(UNAVAILABLE);
    }
  });

  bot.command("year", async (ctx) => {
    try {
      const res = await fetch(`${base}/api/sewn`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        await ctx.reply("Не удалось получить итоги, попробуйте позже.");
        return;
      }
      const { stats } = (await res.json()) as YearStatsResponse;
      if (stats.count === 0) {
        await ctx.reply(`За ${stats.year} год записей пока нет. Добавьте вещь командой /sewn.`);
        return;
      }

      const lines = [
        `Итоги ${stats.year} года`,
        `Сшито вещей: ${stats.count}`,
        `Потрачено: ${money.format(stats.totalCost)} ₽`,
        stats.pricedCount > 0
          ? `Сэкономлено: ${money.format(stats.totalSaved)} ₽ (по ${stats.pricedCount} из ${stats.count})`
          : "Сэкономлено: нет данных, цену в магазине можно указать в /sewn",
      ];
      if (stats.giftCount > 0) {
        lines.push(
          `Подарков: ${stats.giftCount} на ${money.format(stats.giftSpent)} ₽ — в экономию не входят`
        );
      }
      if (stats.topFabrics.length > 0) {
        lines.push(
          `Чаще всего: ${stats.topFabrics.map((f) => `${f.name} (${f.count})`).join(", ")}`
        );
      }
      await ctx.reply(lines.join("\n"));
    } catch {
      await ctx.reply(UNAVAILABLE);
    }
  });
}
