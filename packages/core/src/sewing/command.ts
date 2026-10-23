import { validateSewnInput, type SewnInput } from "./validate";

export type SewnCommandResult = { ok: true; value: SewnInput } | { ok: false; error: string };

export const SEWN_COMMAND_USAGE =
  "Формат: /sewn название; затраты; цена в магазине; ткань\n" +
  "Цена в магазине и ткань необязательны.\n" +
  "Например: /sewn Платье из льна; 1200; 4500; linen";

/** Число рублей из текста: допускает пробелы и «₽», «р», «руб.» в конце. */
function parseRubles(text: string): number | null | undefined {
  const cleaned = text.replace(/[\s\u00a0]/g, "").replace(/(₽|руб\.?|р\.?)$/i, "");
  if (cleaned === "" || cleaned === "-") return null;
  return /^\d{1,8}$/.test(cleaned) ? Number(cleaned) : undefined;
}

/**
 * Разбирает аргументы команды бота «/sewn название; затраты; цена; ткань».
 * Возвращает уже проверенное значение или понятную ошибку.
 */
export function parseSewnCommand(args: string): SewnCommandResult {
  const parts = args.split(";").map((part) => part.trim());
  if (parts.length < 2 || !parts[0]) {
    return { ok: false, error: "Нужны хотя бы название и затраты." };
  }

  const cost = parseRubles(parts[1]);
  if (cost === undefined || cost === null) {
    return { ok: false, error: "Затраты — целое число рублей." };
  }
  const marketPrice = parts[2] === undefined ? null : parseRubles(parts[2]);
  if (marketPrice === undefined) {
    return { ok: false, error: "Цена в магазине — целое число рублей." };
  }

  return validateSewnInput({
    name: parts[0],
    cost,
    marketPrice,
    fabricSlug: parts[3] ? parts[3].toLowerCase() : null,
  });
}
