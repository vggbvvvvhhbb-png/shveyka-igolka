/**
 * Настройки машины из записей каталога — в виде строк для карточки.
 *
 * Ответ модели перечисляет настройки текстом: «игла 90/14, нить 40,
 * строчка 2,5 мм». Читать это можно, но сверяться с каталогом неудобно —
 * цифры надо вылавливать глазами из абзаца.
 *
 * Здесь те же настройки собираются из записей каталога в строки: подпись
 * и значение. Источник — сами записи, а не текст ответа: так карточка
 * не может разойтись с каталогом.
 */

import type { ContextEntry } from "./contextEntries";
import {
  FOOT_LABELS,
  STITCH_LABELS,
  formatRange,
  pickField,
  threadLabel,
  typeLabel,
} from "./humanize";
import { ROUTE_SEGMENT } from "./pageContext";

/** Одна настройка: подпись и значение. */
export type SettingRow = {
  /** Подпись настройки: «Игла», «Нить», «Строчка», «Натяжение», «Лапка». */
  label: string;
  /** Значение словами: «90/14 (джинсовая)». */
  value: string;
};

/**
 * Карточка записи каталога под ответом.
 *
 * К записи прилагаются её настройки машины: карточка отвечает не только
 * «какая это ткань», но и «что на ней шить».
 */
export type RelatedCard = {
  /** Название записи. */
  label: string;
  /** Адрес страницы записи. */
  href: string;
  /** Настройки машины для этой записи. */
  settings: SettingRow[];
};

/**
 * Сколько записей показывают настройки.
 *
 * Настроек полно у каждой записи, а записей в контексте ответа до шести.
 * Показывать настройки у всех — значит превратить карточку в таблицу:
 * человек потеряет из виду, какая запись к какой относится. Настройки
 * показывают у первых записей, а дальше остаётся просто ссылка.
 */
export const MAX_CARDS_WITH_SETTINGS = 2;

/** Поле настроек записи каталога. */
type SettingsLike = Record<string, unknown>;

/** Значение настройки: строка без разбора или диапазон с единицей измерения. */
function value(settings: SettingsLike, keys: readonly string[], unit = ""): string | null {
  const raw = pickField(settings, keys);
  const formatted = formatRange(raw);
  if (formatted) return `${formatted}${unit}`;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

/** Строка без служебных символов или null. */
function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Строки настроек одной записи.
 *
 * Порядок строк не случаен: сначала игла, потом нить, потом строчка —
 * так же, как человек настраивает машину.
 */
function rowsOf(settings: SettingsLike): SettingRow[] {
  const rows: SettingRow[] = [];

  const needleSize = value(settings, ["needle_size"]);
  const needleType = typeLabel(pickField(settings, ["needle_type"]));
  if (needleSize) {
    rows.push({
      label: "Игла",
      value: needleType ? `${needleSize} (${needleType})` : needleSize,
    });
  } else if (needleType) {
    rows.push({ label: "Игла", value: needleType });
  }

  const threadWeight = value(settings, ["thread_weight", "thread"]);
  const threadMaterial = threadLabel(pickField(settings, ["thread_material"]));
  if (threadWeight || threadMaterial) {
    const parts = [threadWeight, threadMaterial].filter((part): part is string => !!part);
    rows.push({ label: "Нить", value: parts.join(", ") });
  }

  const stitchType = STITCH_LABELS[asString(pickField(settings, ["stitch_type"])) ?? ""];
  const stitchLength = value(settings, ["stitch_length_mm", "stitch_length"], " мм");
  const stitchWidth = value(settings, ["stitch_width_mm", "stitch_width"], " мм");
  const stitchParts = [
    stitchType ?? asString(pickField(settings, ["stitch_type"])),
    stitchLength ? `длина стежка ${stitchLength}` : null,
    stitchWidth ? `ширина стежка ${stitchWidth}` : null,
  ].filter((part): part is string => !!part);
  if (stitchParts.length > 0) {
    rows.push({ label: "Строчка", value: stitchParts.join(", ") });
  }

  const tension = value(settings, ["top_tension"]);
  if (tension) rows.push({ label: "Натяжение нити", value: tension });

  const foot = value(settings, ["presser_foot", "foot"]);
  if (foot) {
    rows.push({ label: "Лапка", value: FOOT_LABELS[foot] ?? foot.replace(/_/g, " ") });
  }

  return rows;
}

/**
 * Карточки записей каталога вместе с настройками машины.
 *
 * Настройки берутся из самих записей каталога, а не из текста ответа:
 * так карточка не может разойтись с каталогом. У проектов настроек нет,
 * поэтому у них список пустой — карточка всё равно показывает запись.
 */
export function collectRelatedCards(entries: readonly ContextEntry[]): RelatedCard[] {
  let withSettings = 0;

  return entries.map((entry) => {
    const settings =
      entry.kind === "project" ? [] : rowsOf(entry.data.default_machine_settings ?? {});

    // Настройки показывают у первых записей с настройками: иначе карточка
    // превращается в таблицу и перестаёт читаться.
    const showSettings = settings.length > 0 && withSettings < MAX_CARDS_WITH_SETTINGS;
    if (showSettings) withSettings += 1;

    return {
      label: entry.name,
      href: `/${ROUTE_SEGMENT[entry.kind]}/${entry.slug}`,
      settings: showSettings ? settings : [],
    };
  });
}

/**
 * Разбирает заголовок с карточками обратно в список.
 *
 * Заголовок приходит в escape-виде: в названиях записей есть русские буквы,
 * а байтовая строка HTTP-заголовка их не вмещает.
 *
 * Заголовок приходит с сервера, поэтому содержимое может оказаться любым:
 * пустым, обрезанным или вовсе не тем, что ожидалось. Битый заголовок не
 * должен ломать ответ — в этом случае карточек просто не будет.
 */
export function parseRelatedCards(raw: string | null): RelatedCard[] {
  if (!raw) return [];

  let json: string;
  try {
    json = decodeURIComponent(raw);
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const cards: RelatedCard[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const { label, href, settings } = item as {
      label?: unknown;
      href?: unknown;
      settings?: unknown;
    };
    if (typeof label !== "string" || typeof href !== "string") continue;
    // Адрес ведёт внутрь сайта: никакие внешние ссылки карточками не бывают.
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    cards.push({ label, href, settings: parseSettings(settings) });
  }

  return cards;
}

/** Разбор списка настроек из заголовка: битые строки просто не показываются. */
function parseSettings(raw: unknown): SettingRow[] {
  if (!Array.isArray(raw)) return [];

  const rows: SettingRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { label, value } = item as { label?: unknown; value?: unknown };
    if (typeof label !== "string" || typeof value !== "string") continue;
    rows.push({ label, value });
  }
  return rows;
}
