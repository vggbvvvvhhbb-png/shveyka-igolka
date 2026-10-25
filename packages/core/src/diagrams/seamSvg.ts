/**
 * Схемы швов, которые рисуются прямо в браузере.
 *
 * Фотостудии нет, а страница шва без картинки выглядит пустой. Поэтому схема
 * шва генерируется по его типу: ткань рисуется текущим цветом текста (схема
 * сама подстраивается под светлую и тёмную тему), нить — акцентным цветом.
 *
 * Схема — это схематичное сечение, а не чертёж с размерами: припуски и
 * величины остаются в тексте шва.
 */

export type SeamKind =
  | "plain"
  | "zigzag"
  | "overlock"
  | "french"
  | "flatFelled"
  | "hem"
  | "blind"
  | "topstitch";

/**
 * Тип схемы по названию или slug шва.
 *
 * Порядок правил важен: «потайной подгиб» — это blind, а не hem, поэтому
 * правило blind стоит первым. Неизвестный шов получает схему стачного шва —
 * нейтральную и не вводящую в заблуждение.
 */
const RULES: ReadonlyArray<readonly [SeamKind, RegExp]> = [
  ["blind", /blind|потайн/],
  ["zigzag", /zig-?zag|зигзаг/],
  ["overlock", /overlock|оверлок|обмет|обмёт/],
  ["french", /french|француз|бейк|binding|обтач/],
  ["flatFelled", /felled|запошив/],
  ["topstitch", /top-?stitch|отделоч/],
  ["hem", /hem|подгиб|подшив|рубец|выворот/],
];

/**
 * Определяет тип схемы по записи шва.
 *
 * Смотрим на id, slug и название: в каталоге это единственные поля, где
 * зашит смысл шва.
 */
export function classifySeam(s: { id?: string; slug?: string; name?: string }): SeamKind {
  const text = `${s.id ?? ""} ${s.slug ?? ""} ${s.name ?? ""}`.toLowerCase();
  return RULES.find(([, re]) => re.test(text))?.[0] ?? "plain";
}

/**
 * Экранирование текста, который попадает в атрибут SVG.
 *
 * Это единственное место, где в схему попадает внешний текст: имя шва.
 */
const escapeXml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Прямоугольник детали ткани. */
const layer = (x: number, y: number, w: number, h = 10): string =>
  `<rect class="shv-f" x="${x}" y="${y}" width="${w}" height="${h}"/>`;

/** Стрелка направления подачи ткани. */
const arrow = (x: number, y: number): string => `<path class="shv-a" d="M${x} ${y - 4}l9 4-9 4z"/>`;

/**
 * Тело схемы в системе координат 240×120.
 *
 * Классы с префиксом shv-, чтобы стили схемы не задели другие элементы
 * страницы: короткое имя класса легко пересекается с чужим.
 */
const BODY: Record<SeamKind, string> = {
  // Стачной шов: две детали внахлёст и строчка через обе.
  plain: layer(16, 44, 208, 14) + layer(32, 62, 192, 14) + '<path class="shv-t" d="M132 36V84"/>',

  // Зигзаг: вид сверху, стежки зигзагом вдоль края и стрелка подачи ткани.
  zigzag:
    '<rect class="shv-f" x="20" y="16" width="200" height="80"/>' +
    `<path class="shv-t" d="M30 70${Array.from(
      { length: 15 },
      (_, i) => `L${42 + i * 12} ${i % 2 ? 70 : 42}`
    ).join("")}"/>` +
    '<path class="shv-l" d="M30 108H200"/>' +
    arrow(200, 108),

  // Оверлок: вид сверху, край ткани и обмёточные стежки через него.
  overlock:
    '<rect class="shv-f" x="20" y="16" width="148" height="84"/>' +
    '<path class="shv-t" d="M150 20V96M176 20V96' +
    Array.from({ length: 9 }, (_, i) => `M150 ${22 + i * 9}L176 ${28 + i * 9}`).join("") +
    '"/>',

  // Французский шов: шаг 1 — строчка у края, шаг 2 — сгиб и вторая строчка,
  // которая прячет срезы.
  french:
    layer(14, 50, 96, 12) +
    layer(14, 66, 96, 12) +
    '<path class="shv-t" d="M88 38V86"/>' +
    '<path class="shv-l" d="M114 62H132"/>' +
    arrow(132, 62) +
    '<path fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="10" d="M146 50H206q14 0 14 12t-14 12H146"/>' +
    '<path class="shv-t" d="M180 38V86"/>',

  // Запошивочный шов: один припуск подогнут поверх другого, две строчки.
  flatFelled:
    layer(20, 70, 200, 12) +
    layer(20, 58, 112, 12) +
    layer(112, 46, 80, 12) +
    '<path class="shv-t" d="M138 36V90M184 36V90"/>',

  // Подгиб: край основной ткани подвёрнут и прошит.
  hem:
    layer(16, 46, 208, 14) +
    layer(120, 60, 104, 12) +
    layer(120, 72, 104, 12) +
    '<path class="shv-t" d="M132 40V90"/>',

  // Потайной подгиб: нить ловит лишь край основной ткани.
  blind:
    layer(16, 44, 208, 14) +
    layer(16, 62, 110, 12) +
    `<path class="shv-t" d="M22 66${Array.from(
      { length: 8 },
      (_, i) => `L${34 + i * 12} ${i % 2 ? 66 : 52}`
    ).join("")}"/>`,

  // Отделочная строчка: две параллельные линии вдоль шва.
  topstitch:
    '<rect class="shv-f" x="20" y="16" width="200" height="88"/>' +
    '<path class="shv-l" d="M20 60H220"/>' +
    '<path class="shv-t shv-d" d="M20 48H220M20 72H220"/>',
};

const STYLE =
  "<style>" +
  ".shv-f{fill:currentColor;fill-opacity:.1;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round}" +
  ".shv-l{fill:none;stroke:currentColor;stroke-opacity:.5;stroke-width:1.2}" +
  ".shv-t{fill:none;stroke:#c2410c;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
  ".shv-d{stroke-dasharray:6 4}" +
  ".shv-a{fill:currentColor;stroke:none}" +
  "</style>";

/**
 * Готовая SVG-строка.
 *
 * Содержимое схемы генерируется здесь, пользовательский ввод — только в
 * aria-label, и он экранируется.
 */
export function renderSeamSvg(kind: SeamKind, label: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" role="img" ` +
    `aria-label="${escapeXml(label)}">${STYLE}${BODY[kind]}</svg>`
  );
}
