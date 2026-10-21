/**
 * Чтение ответов диалога.
 *
 * Ответы хранятся как `unknown`: так мы не протаскиваем `any` в сценарии и
 * всегда проверяем тип перед использованием.
 */

import type { Data } from "../session";

/** Число из ответа. Если ответа нет — 0. */
export const num = (d: Data, key: string): number => {
  const v = d[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
};

/** Строка из ответа. Если ответа нет — пустая строка. */
export const str = (d: Data, key: string): string => {
  const v = d[key];
  return typeof v === "string" ? v : "";
};

/** true / false из ответа. */
export const bool = (d: Data, key: string): boolean => d[key] === true;

/** Список строк из ответа. */
export const strList = (d: Data, key: string): string[] => {
  const v = d[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
};

/**
 * Список чисел из ответа. Пропуски сохраняются, чтобы не сдвинуть позиции:
 * цены по ширинам рулона идут в том же порядке, в котором заданы ширины.
 */
export const numList = (d: Data, key: string): (number | undefined)[] => {
  const v = d[key];
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "number" && Number.isFinite(x) ? x : undefined));
};

/** Значение из ответа, если оно есть среди вариантов. Иначе — undefined. */
export const maybeOneOf = <T extends string>(
  d: Data,
  key: string,
  allowed: Record<T, string>
): T | undefined => {
  const v = d[key];
  if (typeof v !== "string" || !Object.hasOwn(allowed, v)) return undefined;
  return v as T;
};

/** Значение из ответа, если оно есть среди вариантов. Иначе — запасной вариант. */
export const oneOf = <T extends string>(
  d: Data,
  key: string,
  allowed: Record<T, string>,
  fallback: T
): T => maybeOneOf(d, key, allowed) ?? fallback;
