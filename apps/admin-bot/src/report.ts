/**
 * Тексты отчётов о расходе токенов.
 *
 * Сборка текста — чистая функция без базы и Telegram: так её можно
 * проверить тестом и переиспользовать в ежедневном отчёте и в ответе на
 * команду.
 */

import { countPhrase, USAGE_FEATURE_LABELS, USAGE_SOURCE_LABELS } from "@shveyka/core";
import type { queries } from "@shveyka/db";

/** Данные для сводного отчёта. */
export interface ReportData {
  /** Название периода: «сегодня», «7 дней», «30 дней». */
  title: string;
  /** Итоги по периоду. */
  totals: queries.UsageTotals;
  /** Расход по функциям помощника. */
  byFeature: queries.UsageByFeature[];
  /** Расход по источнику: сайт или бот. */
  bySource: queries.UsageBySource[];
  /** Кто сколько потратил. */
  topUsers: queries.UsageUser[];
  /** Ориентировочная стоимость расхода, если цена известна. */
  cost?: string | null;
}

/** Данные по одному пользователю. */
export interface UserReportData {
  /** Ключ пользователя: `tg:12345` или `web:...`. */
  userKey: string;
  /** Имя или ник, если известен. */
  userLabel: string | null;
  /** Название периода. */
  title: string;
  /** Итоги по пользователю. */
  totals: queries.UsageTotals;
  /** Расход по функциям. */
  byFeature: queries.UsageByFeature[];
  /** Последние запросы. */
  recent: queries.UsageRecord[];
}

/** Разделитель тысяч: 48 320. */
const num = new Intl.NumberFormat("ru-RU");

/** Название функции помощника: известные — по-русски, новые — как есть. */
export function featureLabel(feature: string): string {
  return USAGE_FEATURE_LABELS[feature as keyof typeof USAGE_FEATURE_LABELS] ?? feature;
}

/** Название источника запроса. */
export function sourceLabel(source: string): string {
  return USAGE_SOURCE_LABELS[source as keyof typeof USAGE_SOURCE_LABELS] ?? source;
}

/** Как выглядит человек в отчёте: ник, если есть, иначе ключ. */
export function userLabel(userKey: string, label: string | null): string {
  return label && label.length > 0 ? `${label} (${userKey})` : userKey;
}

/** Собирает сводный отчёт. */
export function buildReport(data: ReportData): string {
  const { totals } = data;
  const lines: string[] = [];

  lines.push(`Расход помощника — ${data.title}`);
  lines.push("");
  lines.push(`Запросов: ${num.format(totals.requests)}`);
  lines.push(
    `Токенов: ${num.format(totals.totalTokens)} (вопросы ${num.format(
      totals.promptTokens
    )}, ответы ${num.format(totals.completionTokens)})`
  );
  if (data.cost) {
    lines.push(`Ориентировочная стоимость: ${data.cost}`);
  }

  if (data.byFeature.length > 0) {
    lines.push("");
    lines.push("Чем пользовались:");
    for (const row of data.byFeature) {
      lines.push(
        `• ${featureLabel(row.feature)} — ${countPhrase(row.requests, [
          "запрос",
          "запроса",
          "запросов",
        ])}, ${num.format(row.totalTokens)} токенов`
      );
    }
  }

  if (data.bySource.length > 0) {
    lines.push("");
    lines.push("Откуда:");
    for (const row of data.bySource) {
      lines.push(
        `• ${sourceLabel(row.source)} — ${countPhrase(row.requests, [
          "запрос",
          "запроса",
          "запросов",
        ])}, ${num.format(row.totalTokens)} токенов`
      );
    }
  }

  if (data.topUsers.length > 0) {
    lines.push("");
    lines.push("Кто потратил:");
    for (const row of data.topUsers) {
      lines.push(
        `• ${userLabel(row.userKey, row.userLabel)} — ${countPhrase(row.requests, [
          "запрос",
          "запроса",
          "запросов",
        ])}, ${num.format(row.totalTokens)} токенов`
      );
    }
  }

  if (totals.requests === 0) {
    lines.push("");
    lines.push("За этот период запросов не было.");
  }

  lines.push("");
  lines.push("Подробнее по человеку: /user <id>");

  return lines.join("\n");
}

/** Собирает отчёт по одному пользователю. */
export function buildUserReport(data: UserReportData): string {
  const lines: string[] = [];
  lines.push(`Расход — ${userLabel(data.userKey, data.userLabel)}`);
  lines.push(`Период: ${data.title}`);
  lines.push("");
  lines.push(`Запросов: ${num.format(data.totals.requests)}`);
  lines.push(
    `Токенов: ${num.format(data.totals.totalTokens)} (вопросы ${num.format(
      data.totals.promptTokens
    )}, ответы ${num.format(data.totals.completionTokens)})`
  );

  if (data.byFeature.length > 0) {
    lines.push("");
    lines.push("Чем пользовался:");
    for (const row of data.byFeature) {
      lines.push(
        `• ${featureLabel(row.feature)} — ${countPhrase(row.requests, [
          "запрос",
          "запроса",
          "запросов",
        ])}, ${num.format(row.totalTokens)} токенов`
      );
    }
  }

  if (data.recent.length > 0) {
    lines.push("");
    lines.push("Последние запросы:");
    for (const row of data.recent) {
      const time = new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(row.createdAt);
      lines.push(
        `• ${time} — ${featureLabel(row.feature)}, ${num.format(row.totalTokens)} токенов${
          row.cached ? " (из кэша)" : ""
        }`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Приблизительная стоимость расхода.
 *
 * Цена за миллион токенов задаётся переменной окружения: у провайдера она
 * своя для каждой модели, а точный тариф меняется. Если цена не задана,
 * показывать деньги не о чем.
 */
export function estimateCost(totalTokens: number, pricePerMillion: number): string | null {
  if (!Number.isFinite(pricePerMillion) || pricePerMillion <= 0) return null;
  const cost = (totalTokens / 1_000_000) * pricePerMillion;
  return `≈ ${cost.toFixed(2)} ₽`;
}

/** Собирает CSV по расходу: удобно открыть в таблице. */
export function buildCsv(rows: queries.UsageRecord[]): string {
  const header = [
    "Дата",
    "Пользователь",
    "Имя",
    "Источник",
    "Функция",
    "Режим",
    "Модель",
    "Вопрос",
    "Ответ",
    "Всего",
    "Из кэша",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const date = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      dateStyle: "short",
      timeStyle: "short",
    }).format(row.createdAt);
    lines.push(
      [
        date,
        row.userKey,
        row.userLabel ?? "",
        row.source,
        row.feature,
        row.mode ?? "",
        row.model ?? "",
        row.promptTokens,
        row.completionTokens,
        row.totalTokens,
        row.cached ? "да" : "нет",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
  }
  return lines.join("\n");
}
