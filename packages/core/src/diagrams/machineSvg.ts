/**
 * Анатомическая схема швейной машины.
 *
 * Фотостудии нет, а «лицо» главной страницы держится на рисунке. Поэтому
 * машина рисуется прямо в браузере: плоский контур, акварельные заливки,
 * красная нить по пути. Всё параметрическое — одна функция на SVG-строки.
 *
 * Геометрия снята с референса: голова слева, рукав с вырезом-горлом,
 * тонкое основание с разрезом, в котором видно шпулю.
 *
 * Схема состоит из отдельных деталей, у каждой свой id и data-part. По этим
 * атрибутам выноски подсвечивают нужную деталь, а скролл-история «Анатомия»
 * наезжает камерой на нужную часть.
 *
 * Нить разбита на пять отрезков: в истории подсвечивается только тот
 * участок, о котором идёт речь.
 *
 * Стили лежат внутри SVG, поэтому схема самодостаточна: её можно вставить
 * куда угодно, и она не заденет чужие элементы страницы. Классы с префиксом
 * shv-m- — короткие имена классов легко пересекаются с чужими.
 */

/** Детали, к которым идут выноски. */
export type MachinePartId =
  | "needle"
  | "presser-foot"
  | "needle-plate"
  | "bobbin"
  | "spool"
  | "tension"
  | "stitch-length"
  | "handwheel";

/** Выноска: подпись, пояснение и ссылка. */
export type MachinePart = {
  id: MachinePartId;
  /** Номер выноски. */
  number: number;
  /** Подпись выноски. */
  label: string;
  /** Короткая подпись для рисунка: в поле выноски помещается не вся. */
  short: string;
  /** Пояснение в правой колонке. */
  note: string;
  /** Куда ведёт выноска. */
  href: string;
  /** Точка на рисунке, из которой выходит линия выноски. */
  anchor: { x: number; y: number };
  /** Точка, где стоит подпись. */
  labelPoint: { x: number; y: number };
  /** С какой стороны от рисунка стоит подпись. */
  side: "left" | "right";
};

/** Один кусок рисунка: разметка детали без обёртки. */
export type MachineShape = {
  id: MachinePartId | "body" | `thread-${1 | 2 | 3 | 4 | 5}`;
  /** Разметка внутри группы: контуры, заливки, детали. */
  markup: string;
};

/** Шаг скролл-истории «Анатомия». */
export type MachineStep = {
  part: MachinePartId;
  title: string;
  text: string;
};

/** Размер рисунка в единицах SVG. */
export const MACHINE_VIEWBOX = { width: 480, height: 380 } as const;

/**
 * Восемь выносок из брифа: Игла, Лапка, Игольная пластина, Шпуля,
 * Катушка, Натяжение, Длина стежка, Маховик.
 */
export const MACHINE_PARTS: readonly MachinePart[] = [
  {
    id: "needle",
    number: 1,
    label: "Игла",
    short: "Игла",
    note: "Проводит нить сквозь ткань. Размер подбирают под материал: тонкому — тоньше, плотному — толще.",
    href: "/seams",
    anchor: { x: 158, y: 244 },
    labelPoint: { x: 100, y: 206 },
    side: "left",
  },
  {
    id: "presser-foot",
    number: 2,
    label: "Лапка",
    short: "Лапка",
    note: "Прижимает ткань к игольной пластине и подаёт её под иглу. Для обычной строчки берут стандартную лапку.",
    href: "/seams",
    anchor: { x: 145, y: 266 },
    labelPoint: { x: 100, y: 244 },
    side: "left",
  },
  {
    id: "needle-plate",
    number: 3,
    label: "Игольная пластина и рейка",
    short: "Пластина",
    note: "Пластина закрывает отверстие под иглу. Через прорези проходит рейка: она поднимает ткань после каждого стежка.",
    href: "/seams",
    anchor: { x: 158, y: 292 },
    labelPoint: { x: 100, y: 286 },
    side: "left",
  },
  {
    id: "bobbin",
    number: 4,
    label: "Шпуля",
    short: "Шпуля",
    note: "Лежит под пластиной. Нить из шпули перехватывается и образует вторую нить стежка — снизу видно переплетение.",
    href: "/hardware",
    anchor: { x: 172, y: 315 },
    labelPoint: { x: 100, y: 330 },
    side: "left",
  },
  {
    id: "spool",
    number: 5,
    label: "Катушечный стержень",
    short: "Катушка",
    note: "Стоит сверху на стержне. Нить с катушки идёт через регулятор натяжения, а оттуда — в иглу.",
    href: "/hardware",
    anchor: { x: 294, y: 26 },
    labelPoint: { x: 372, y: 26 },
    side: "right",
  },
  {
    id: "tension",
    number: 6,
    label: "Регулятор натяжения",
    short: "Натяжение",
    note: "Задаёт натяжение верхней нити. Слабое натяжение даёт петляние стежков, слишком сильное — обрыв нити.",
    href: "/fabrics",
    anchor: { x: 137, y: 122 },
    labelPoint: { x: 100, y: 100 },
    side: "left",
  },
  {
    id: "stitch-length",
    number: 7,
    label: "Регулятор длины стежка",
    short: "Длина стежка",
    note: "Меняет длину стежка. Короткий стежок — для мелких деталей, длинный — для плотных тканей.",
    href: "/seams",
    anchor: { x: 137, y: 158 },
    labelPoint: { x: 100, y: 156 },
    side: "left",
  },
  {
    id: "handwheel",
    number: 8,
    label: "Маховик",
    short: "Маховик",
    note: "Поднимает и опускает рейку, двигая ткань. Он же поднимает лапку, когда ткань заканчивается.",
    href: "/start",
    anchor: { x: 336, y: 120 },
    labelPoint: { x: 372, y: 118 },
    side: "right",
  },
];

/**
 * Восемь шагов скролл-истории — те же детали, что и выноски.
 * Тексты описывают работу механизма, без выдуманных чисел.
 */
export const MACHINE_STEPS: readonly MachineStep[] = [
  {
    part: "needle",
    title: "Игла",
    text: "Игла проводит нить сквозь ткань и уходит вниз. Её размер подбирают под материал: тонкому — тоньше, плотному — толще.",
  },
  {
    part: "presser-foot",
    title: "Лапка",
    text: "Лапка прижимает ткань к игольной пластине и подаёт её под иглу. Для обычной строчки берут стандартную лапку.",
  },
  {
    part: "needle-plate",
    title: "Игольная пластина и рейка",
    text: "Пластина с прорезями закрывает отверстие под иглу. Через прорези проходит рейка: она поднимает ткань после каждого стежка.",
  },
  {
    part: "bobbin",
    title: "Шпуля",
    text: "Шпуля лежит под пластиной. Нить из неё перехватывается и образует вторую нить стежка — снизу видно переплетение.",
  },
  {
    part: "spool",
    title: "Катушечный стержень",
    text: "Катушка стоит сверху на стержне. Нить с неё идёт через регулятор натяжения, а оттуда — в иглу.",
  },
  {
    part: "tension",
    title: "Регулятор натяжения",
    text: "Задаёт натяжение верхней нити. Слабое натяжение даёт петляние стежков, слишком сильное — обрыв нити.",
  },
  {
    part: "stitch-length",
    title: "Регулятор длины стежка",
    text: "Меняет длину стежка. Короткий стежок — для мелких деталей, длинный — для плотных тканей.",
  },
  {
    part: "handwheel",
    title: "Маховик",
    text: "Поднимает и опускает рейку, двигая ткань. Он же поднимает лапку, когда ткань заканчивается.",
  },
];

/**
 * Какой отрезок нити относится к какой детали.
 *
 * В скролл-истории подсвечивается только нужный участок пути нити.
 */
export const MACHINE_THREAD_SEGMENT: Readonly<Record<MachinePartId, number>> = {
  needle: 4,
  "presser-foot": 5,
  "needle-plate": 5,
  bobbin: 5,
  spool: 1,
  tension: 2,
  "stitch-length": 3,
  handwheel: 1,
};

/** Экранирование текста, который попадает в атрибут SVG. */
const escapeXml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Стили схемы.
 *
 * Цвета берутся из токенов темы, поэтому рисунок сам подстраивается под
 * светлую и ночную таблицу и меняет акцент вместе с сайтом.
 */
export const MACHINE_STYLE =
  "<style>" +
  ".shv-m-line{fill:none;stroke:var(--ink,#1e2b25);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}" +
  ".shv-m-line-thin{fill:none;stroke:var(--ink,#1e2b25);stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}" +
  ".shv-m-metal{fill:var(--paper-hi,#fffdf6);stroke:var(--ink,#1e2b25);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}" +
  ".shv-m-wash{fill:var(--green-wash,#8dbba6);stroke:none}" +
  ".shv-m-wash-gold{fill:var(--gold-wash,#f3dc8e);stroke:none}" +
  ".shv-m-thread{fill:none;stroke:var(--thread,#c23b22);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}" +
  ".shv-m-hatch{fill:none;stroke:var(--ink,#1e2b25);stroke-width:.7;stroke-opacity:.32}" +
  // Подсветка активной детали живёт здесь же: правило в том же файле
  // стилей, значит не спорит с глобальными таблицами стилей.
  "[data-part-active] .shv-m-wash{fill:var(--gold-wash,#f3dc8e)}" +
  "[data-part-active] .shv-m-line{stroke-width:2.4}" +
  "[data-part-active] .shv-m-line-thin{stroke-width:1.6}" +
  "[data-part-active] .shv-m-thread{stroke-width:2.4}" +
  "</style>";

/**
 * Фильтры.
 *
 * «Дрожь» линии — расхождение контура на полтора пикселя, поэтому линия
 * выглядит нарисованной от руки, а не вычерченной. Мягкий край нужен
 * акварельным заливкам: им положено расплываться, как настоящей краске.
 */
export const MACHINE_DEFS =
  "<defs>" +
  '<filter id="shv-m-wobble" x="-5%" y="-5%" width="110%" height="110%">' +
  '<feTurbulence type="fractalNoise" baseFrequency="0.016 0.024" numOctaves="2" seed="11" result="t"/>' +
  '<feDisplacementMap in="SourceGraphic" in2="t" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>' +
  "</filter>" +
  '<filter id="shv-m-soft" x="-14%" y="-14%" width="128%" height="128%">' +
  '<feGaussianBlur stdDeviation="1.7"/>' +
  "</filter>" +
  "</defs>";

/**
 * Силуэт для акварельной заливки.
 *
 * Второй подконтур — прорезь горла под рукавом; evenodd превращает её в
 * дырку. Заливка смещена на пару пикселей: получается неточная приводка,
 * как у оттиска.
 */
const BODY_SILHOUETTE =
  "M123 62C190 56 260 64 327 66V296H335V336H110V296H120V288H142V205H123Z" +
  "M174 88C205 135 245 162 281 178V296H172V205H174Z";

/** Контуры корпуса: голова, рукав, стойка, горло, основание. */
const BODY_LINES =
  '<path class="shv-m-line" d="M123 205V62C190 56 260 64 327 66V296"/>' +
  '<path class="shv-m-line" d="M174 205V88C205 135 245 162 281 178V296"/>' +
  '<path class="shv-m-line" d="M142 205V288H120V296"/>' +
  '<path class="shv-m-line" d="M123 205H142M172 205H174"/>' +
  '<path class="shv-m-line" d="M110 296H335V336H110Z"/>';

/** Штриховка вместо градиента: тень на стойке и на передней стенке основания. */
const BODY_HATCH =
  '<path class="shv-m-hatch" d="M287 180V288M293 180V288M299 180V288M305 180V288M311 180V288M317 180V288"/>' +
  '<path class="shv-m-hatch" d="M196 302H330M196 308H330M196 314H330M196 320H330"/>' +
  '<path class="shv-m-hatch" d="M123 70H327M123 76H327"/>';

/**
 * Куски рисунка по деталям.
 *
 * Порядок важен: сначала акварель, потом контур, потом мелкие детали.
 */
export const MACHINE_SHAPES: readonly MachineShape[] = [
  {
    id: "body",
    markup:
      `<path class="shv-m-wash" d="${BODY_SILHOUETTE}" fill-rule="evenodd" ` +
      'transform="translate(1.6 -1.4)" opacity=".6"/>' +
      `<g filter="url(#shv-m-soft)" opacity=".45">` +
      `<path class="shv-m-wash" d="${BODY_SILHOUETTE}" fill-rule="evenodd"/></g>` +
      `<g filter="url(#shv-m-wobble)">${BODY_LINES}</g>` +
      BODY_HATCH,
  },
  {
    id: "spool",
    markup:
      '<path class="shv-m-wash-gold" d="M285 40H303L295 12H293Z" opacity=".45"/>' +
      '<path class="shv-m-line" d="M285 40H303L296 12H292Z"/>' +
      '<path class="shv-m-line-thin" d="M294 40V62"/>' +
      '<path class="shv-m-line-thin" d="M288 28H300M286 34H302"/>',
  },
  {
    id: "tension",
    markup:
      '<circle class="shv-m-wash-gold" cx="137" cy="122" r="9" opacity=".45"/>' +
      '<circle class="shv-m-metal" cx="137" cy="122" r="9"/>' +
      '<path class="shv-m-line-thin" d="M137 116V122"/>',
  },
  {
    id: "stitch-length",
    markup:
      '<circle class="shv-m-wash-gold" cx="137" cy="158" r="9" opacity=".45"/>' +
      '<circle class="shv-m-metal" cx="137" cy="158" r="9"/>' +
      '<path class="shv-m-line-thin" d="M132 158H142"/>',
  },
  {
    id: "handwheel",
    markup:
      '<circle class="shv-m-wash" cx="336" cy="120" r="26" opacity=".4"/>' +
      '<circle class="shv-m-metal" cx="336" cy="120" r="26"/>' +
      '<circle class="shv-m-line-thin" cx="336" cy="120" r="17"/>' +
      '<path class="shv-m-line-thin" d="M336 94V146M310 120H362M318 102L354 138M354 102L318 138"/>' +
      '<circle class="shv-m-metal" cx="336" cy="120" r="4"/>',
  },
  {
    id: "needle",
    markup:
      '<path class="shv-m-line" d="M154 205H162V232H154Z"/>' +
      '<path class="shv-m-line" d="M158 232V262"/>' +
      '<ellipse class="shv-m-line-thin" cx="158" cy="256" rx="2" ry="3.2"/>',
  },
  {
    id: "presser-foot",
    markup:
      '<path class="shv-m-line" d="M145 205V262"/>' +
      '<path class="shv-m-line" d="M136 262H154L149 271H141Z"/>',
  },
  {
    id: "needle-plate",
    markup:
      '<path class="shv-m-metal" d="M120 288H196V296H120Z"/>' +
      '<path class="shv-m-line-thin" d="M139 296V289L142 291L145 289V296"/>' +
      '<path class="shv-m-line-thin" d="M158 288V296"/>',
  },
  {
    id: "bobbin",
    markup:
      '<circle class="shv-m-wash-gold" cx="172" cy="315" r="12" opacity=".5"/>' +
      '<circle class="shv-m-metal" cx="172" cy="315" r="12"/>' +
      '<circle class="shv-m-line-thin" cx="172" cy="315" r="5"/>' +
      '<path class="shv-m-line-thin" d="M161 310H183M161 315H183M161 320H183"/>',
  },
  {
    id: "thread-1",
    markup:
      '<path class="shv-m-thread" pathLength="1" d="M292 14C252 4 202 24 180 50C170 60 162 74 158 88"/>',
  },
  {
    id: "thread-2",
    markup: '<path class="shv-m-thread" pathLength="1" d="M158 88C152 96 146 102 143 110"/>',
  },
  {
    id: "thread-3",
    markup: '<path class="shv-m-thread" pathLength="1" d="M137 131C140 160 152 182 158 205V230"/>',
  },
  {
    id: "thread-4",
    markup: '<path class="shv-m-thread" pathLength="1" d="M158 232V258"/>',
  },
  {
    id: "thread-5",
    markup: '<path class="shv-m-thread" pathLength="1" d="M158 260V290"/>',
  },
];

/**
 * Разметка схемы без обёртки <svg>.
 *
 * Веб-компонент вставляет её в свой <svg>: так выноски остаются React-узлами
 * и могут быть настоящими ссылками, а детали остаются адресуемыми.
 */
export const MACHINE_SVG_INNER: string =
  MACHINE_DEFS +
  MACHINE_STYLE +
  MACHINE_SHAPES.map(
    (shape) => `<g id="shv-m-${shape.id}" data-part="${shape.id}">${shape.markup}</g>`
  ).join("");

/** Готовая SVG-схема машины одной строкой. */
export function renderMachineSvg(options?: { title?: string }): string {
  const title = escapeXml(options?.title ?? "Швейная машина в разрезе-схеме");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MACHINE_VIEWBOX.width} ${MACHINE_VIEWBOX.height}" ` +
    `role="img" aria-label="${title}">${MACHINE_SVG_INNER}</svg>`
  );
}

/** Часть по идентификатору. */
export function getMachinePart(id: MachinePartId): MachinePart | undefined {
  return MACHINE_PARTS.find((part) => part.id === id);
}
