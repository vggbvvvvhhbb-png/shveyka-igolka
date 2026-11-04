/**
 * Состояние внешних служб сайта.
 *
 * Страница владельца отвечает на вопрос «почему режимы с интернетом
 * работают так»: видно, какая служба настроена, какая требует ежедневной
 * проверки у провайдера и что с письмами. Значения ключей сюда не
 * попадают — только состояние.
 */

import {
  describeProviderStatus,
  describeWebServices,
  PROVIDER_LABELS,
  providerKeyEnv,
  providerReady,
  resolveProviderName,
  webServicesStatus,
} from "@shveyka/core";
import { mailConfigured } from "@/lib/mail";

/** Одна строка разбора: что за служба и в каком она состоянии. */
export type ServiceRow = {
  /** Название службы. */
  label: string;
  /** Что с ней — коротко и по-человечески. */
  value: string;
  /** Всё ли в порядке. */
  ok: boolean;
};

/**
 * Разбор состояния служб.
 *
 * Порядок — от режима «Каталог» к режимам с интернетом и почте: так же,
 * как человек выбирает режим в помощнике.
 */
export function servicesStatus(): ServiceRow[] {
  const rows: ServiceRow[] = [];

  // Режим «Каталог»: отвечает провайдер из AI_PROVIDER.
  const provider = resolveProviderName(process.env.AI_PROVIDER);
  const catalogReady = providerReady(provider);
  rows.push({
    label: `Режим «Каталог» — ${PROVIDER_LABELS[provider]}`,
    value: catalogReady
      ? "ключ задан, режим отвечает"
      : `ключ не задан (${providerKeyEnv(provider)}) — режим не ответит`,
    ok: catalogReady,
  });

  // Режимы с интернетом: поиск и модели — разные ключи.
  const services = webServicesStatus();
  for (const service of describeWebServices(services)) {
    rows.push({ label: service.label, value: service.text, ok: service.state === "ready" });
  }

  // Что с самим провайдером моделей: отвечает он или требует проверки.
  for (const row of describeProviderStatus()) {
    rows.push({ label: row.label, value: row.value, ok: row.ok });
  }

  // Письма с формы обращений.
  const mailReady = mailConfigured();
  rows.push({
    label: "Письма с формы обращений",
    value: mailReady
      ? "настроены, обращения приходят письмом"
      : "не настроены — обращения сохраняются, но письмом не уходят",
    ok: mailReady,
  });

  return rows;
}
