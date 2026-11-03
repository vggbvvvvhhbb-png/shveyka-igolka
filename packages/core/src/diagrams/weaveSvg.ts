/**
 * Плетение ткани: параметрический SVG-генератор.
 *
 * Фотостудии нет, поэтому вид переплетения рисуется кодом: вертикальные нити —
 * основа, горизонтальные — уток. Каждый вид плетения задаёт правило «какая нить
 * лежит сверху» для ячейки сетки, а вся картинка собирается из этого правила.
 *
 * Два формата:
 * — renderWeaveSvg — большая иллюстрация для карточки ткани;
 * — renderWeaveTile — маленькая бесшовная плитка для CSS-фона.
 *
 * У большой иллюстрации есть два дополнительных слоя: кромка по краям
 * полотна (shv-w-selvedge) и диагональ саржи (shv-w-diagonal). На них
 * указывают выноски, поэтому каждый слой лежит в своей группе.
 *
 * Модуль без зависимостей: наружу отдаются только строки SVG.
 */

export type WeaveKind = "plain" | "twill" | "satin" | "knit" | "rib" | "velvet" | "gauze";

export type WeaveOptions = {
  /** Ширина и высота полотна в единицах SVG. */
  width?: number;
  height?: number;
  /** Цвет основы (вертикальные нити). */
  warp?: string;
  /** Цвет утка (горизонтальные нити). */
  weft?: string;
  /** Число нитей основы. */
  threads?: number;
};

/** Через сколько нитей узор плетения повторяется. */
type Period = 2 | 4 | 5;

/** Правило плетения: как нити ложатся друг на друга. */
type Plan = {
  /** Лежит ли основа сверху в ячейке (столбец i, ряд j). */
  warpOver: (i: number, j: number) => boolean;
  /** Ширина нити основы как доля шага сетки. */
  warpRatio: number;
  /** Высота нити утка как доля шага сетки. */
  weftRatio: number;
  /** Через сколько нитей узор повторяется. */
  period: Period;
};

/** Сетка плетения: сколько нитей в ряду и какой шаг. */
type Grid = {
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  width: number;
  height: number;
};

/** Разобранные параметры отрисовки. */
type Resolved = {
  width: number;
  height: number;
  warp: string;
  weft: string;
  threads: number;
};

/** Участок нити основы, где она лежит сверху. */
type Run = { x: number; y: number; h: number };

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;
const DEFAULT_THREADS = 12;
const DEFAULT_WARP = "#a8a29e";
const DEFAULT_WEFT = "#d6d3d1";

/** Сторона плитки узора в единицах SVG. */
const TILE_SIZE = 48;
/** Нитей на сторону плитки по умолчанию. */
const TILE_THREADS = 4;

/**
 * Правила определения плетения.
 *
 * Порядок важен: бархат проверяем раньше сатина, а резинку — раньше
 * трикотажа, иначе «Рибана (ластик)» уехала бы в трикотаж.
 * Неизвестная ткань получает полотняное плетение — самое нейтральное.
 */
const WEAVE_RULES: ReadonlyArray<readonly [WeaveKind, RegExp]> = [
  ["velvet", /бархат|вельвет|velvet|ворс/],
  ["gauze", /марля|тюль|сетк|gauze|mesh|кружев/],
  ["rib", /резинк|ластик|рибан|rib/],
  ["knit", /трикотаж|кулир|интерлок|футер|джерси|knit/],
  ["satin", /сатин|satin|атлас/],
  ["twill", /сарж|twill|деним|джинс|габардин|твид|ёлочк|шеврон/],
];

/** Правила плетения по виду ткани. */
const PLANS: Record<WeaveKind, Plan> = {
  // Полотняное: каждая нить то над, то под — узор «шахматка».
  plain: {
    warpOver: (i, j) => (i + j) % 2 === 0,
    warpRatio: 0.8,
    weftRatio: 0.82,
    period: 2,
  },

  // Саржа 2/2: диагональ под 45°, линия сдвигается на одну нить каждый ряд.
  twill: {
    warpOver: (i, j) => (i + j) % 4 < 2,
    warpRatio: 0.8,
    weftRatio: 0.82,
    period: 4,
  },

  // Атлас 5 нитей: основа лежит длинными долями, точка закрепки — одна на пять.
  satin: {
    warpOver: (i, j) => (((i - 2 * j) % 5) + 5) % 5 !== 0,
    warpRatio: 0.88,
    weftRatio: 0.9,
    period: 5,
  },

  // Трикотаж рисуется отдельно: там петли, а не переплетение.
  knit: {
    warpOver: () => true,
    warpRatio: 0.66,
    weftRatio: 0.5,
    period: 2,
  },

  // Резинка: приподнятые столбики по две нити, между ними — впадины.
  rib: {
    warpOver: (i) => i % 4 < 2,
    warpRatio: 0.92,
    weftRatio: 0.86,
    period: 4,
  },

  // Бархат: уток скрыт полностью, сверху только ворс.
  velvet: {
    warpOver: () => true,
    warpRatio: 1,
    weftRatio: 1,
    period: 2,
  },

  // Марля: редкая сетка, между нитями видно фон.
  gauze: {
    warpOver: (i, j) => (i + j) % 2 === 0,
    warpRatio: 0.34,
    weftRatio: 0.34,
    period: 2,
  },
};

/** Подписи плетения для aria-label. */
const WEAVE_LABEL: Record<WeaveKind, string> = {
  plain: "Плетение: полотняное",
  twill: "Плетение: саржа",
  satin: "Плетение: атлас",
  knit: "Плетение: трикотаж",
  rib: "Плетение: резинка",
  velvet: "Плетение: бархат",
  gauze: "Плетение: марля",
};

/**
 * Стили нитей.
 *
 * Классы с префиксом shv-, чтобы стили плетения не задели другие элементы
 * страницы: короткое имя класса легко пересекается с чужим.
 */
const THREAD_STYLE =
  "<style>" +
  ".shv-w-weft{stroke:rgba(0,0,0,.16);stroke-width:.6}" +
  ".shv-w-warp{stroke:rgba(0,0,0,.24);stroke-width:.9}" +
  ".shv-w-float{fill:none;stroke:rgba(255,255,255,.45);stroke-width:1;stroke-linecap:round}" +
  ".shv-w-loop{fill:none;stroke-width:2;stroke-linecap:round}" +
  ".shv-w-nap{fill:none;stroke:rgba(0,0,0,.22);stroke-width:1;stroke-linecap:round}" +
  ".shv-w-relief{fill:none;stroke:rgba(0,0,0,.26);stroke-width:1.2;stroke-linecap:round}" +
  ".shv-w-selvedge-shade{fill:rgba(0,0,0,.18)}" +
  ".shv-w-selvedge-thread{fill:none;stroke:rgba(0,0,0,.30);stroke-width:.8}" +
  ".shv-w-selvedge-edge{fill:none;stroke:rgba(0,0,0,.36);stroke-width:1}" +
  ".shv-w-diagonal-line{fill:none;stroke:rgba(0,0,0,.20);stroke-width:.9;stroke-dasharray:5 4}" +
  "</style>";

/** Стили полотна: подложка и рамка нужны только большой иллюстрации. */
const CANVAS_STYLE =
  "<style>" +
  ".shv-w-bg{fill:currentColor;fill-opacity:.06}" +
  ".shv-w-frame{fill:none;stroke:currentColor;stroke-opacity:.22;stroke-width:1.5}" +
  "</style>";

/**
 * Экранирование текста, который попадает в атрибуты SVG.
 *
 * В схему попадают цвета нитей и подпись плетения — оба значения экранируем.
 */
const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Дробное число без длинного хвоста: разметка остаётся читаемой. */
const fmt = (n: number): string => String(Math.round(n * 100) / 100);

/** Ограничивает число: мусорные значения заменяем запасными. */
const limit = (value: number | undefined, fallback: number, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

/** Цвет строки: пустое значение заменяем запасным. */
const color = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

/**
 * Затемняющая подложка основы.
 *
 * Цвет нити подставляется как есть, а глубину даёт второй слой: так основная
 * нить читается темнее утка, и при этом её настоящий цвет не теряется.
 */
const WARP_SHADE = "rgba(0,0,0,.18)";

/** Светлая подложка ворса бархата. */
const NAP_LIGHT = "rgba(255,255,255,.14)";

/**
 * Определяет тип переплетения по ткани.
 *
 * Смотрим на название, состав и узор: в каталоге это те поля, где зашит смысл
 * материала. Неизвестная ткань считается полотняной.
 */
export function classifyWeave(fabric: {
  name?: string;
  composition?: string;
  pattern?: string | null;
}): WeaveKind {
  const text =
    `${fabric.name ?? ""} ${fabric.composition ?? ""} ${fabric.pattern ?? ""}`.toLowerCase();
  return WEAVE_RULES.find(([, re]) => re.test(text))?.[0] ?? "plain";
}

/** Приводит опции к безопасным значениям. */
const resolve = (
  options: WeaveOptions | undefined,
  defaults: { width: number; height: number; threads: number }
): Resolved => {
  const rawWarp = color(options?.warp, DEFAULT_WARP);
  const rawWeft = color(options?.weft, DEFAULT_WEFT);
  return {
    width: limit(options?.width, defaults.width, 40, 1200),
    height: limit(options?.height, defaults.height, 40, 1200),
    warp: escapeXml(rawWarp),
    weft: escapeXml(rawWeft),
    threads: limit(options?.threads, defaults.threads, 2, 64),
  };
};

/** Сетка плетения: сколько нитей и какой шаг. */
const makeGrid = (width: number, height: number, cols: number, rows: number): Grid => ({
  cols,
  rows,
  cw: width / cols,
  ch: height / rows,
  width,
  height,
});

/** Сетка большой иллюстрации: ячейки держим почти квадратными. */
const bigGrid = (r: Resolved): Grid => {
  const cw = r.width / r.threads;
  const rows = Math.max(2, Math.round(r.height / cw));
  return makeGrid(r.width, r.height, r.threads, rows);
};

/**
 * Сетка плитки: число нитей округляем до кратного периоду узора.
 *
 * Иначе в месте стыка узор не совпадёт и плитка станет заметно швовной.
 */
const tileGrid = (kind: WeaveKind, r: Resolved): Grid => {
  const period = PLANS[kind].period;
  const cols = Math.max(period, Math.ceil(r.threads / period) * period);
  return makeGrid(r.width, r.height, cols, cols);
};

/** Нить: прямоугольник с закруглёнными концами. */
const thread = (x: number, y: number, w: number, h: number): string =>
  `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(
    Math.min(w, h) / 2
  )}"/>`;

/**
 * Тканое переплетение.
 *
 * Сначала рисуем ряды утка, поверх — участки основы, где она лежит сверху.
 * Там, где основа уходит под уток, её не видно: так и получается узор.
 */
const paintWoven = (kind: WeaveKind, grid: Grid, r: Resolved): string => {
  const plan = PLANS[kind];
  const warpWidth = grid.cw * plan.warpRatio;
  const weftHeight = grid.ch * plan.weftRatio;

  // Ряды утка выходят за полотно: ткань не обрывается на краю картинки.
  let weft = "";
  for (let j = -1; j <= grid.rows; j++) {
    const y = j * grid.ch + (grid.ch - weftHeight) / 2;
    weft += thread(-grid.cw, y, grid.width + grid.cw * 2, weftHeight);
  }

  // Участки основы: непрерывные полосы там, где она сверху.
  const runs: Run[] = [];
  const under: string[] = [];
  for (let i = 0; i < grid.cols; i++) {
    const x = i * grid.cw + (grid.cw - warpWidth) / 2;
    let start = -1;
    let over = false;
    for (let j = -1; j <= grid.rows; j++) {
      if (plan.warpOver(i, j)) {
        over = true;
        if (start < 0) start = j;
        continue;
      }
      if (start >= 0) {
        runs.push({ x, y: start * grid.ch, h: (j - start) * grid.ch });
        start = -1;
      }
    }
    if (start >= 0) {
      runs.push({ x, y: start * grid.ch, h: (grid.rows + 1 - start) * grid.ch });
    }
    // Нить, уходящая под уток: её видно в промежутках между рядами, и
    // переплетение читается как нить, а не как отдельные точки.
    if (over) under.push(thread(x, -grid.ch, warpWidth, grid.ch * (grid.rows + 2)));
  }

  let warp = "";
  for (const run of runs) warp += thread(run.x, run.y, warpWidth, run.h);

  let texture = "";
  if (kind === "satin") {
    // Блеск долей: светлая ниточка по центру длинного перекрытия.
    for (const run of runs) {
      if (run.h < grid.ch * 1.5) continue;
      const x = run.x + warpWidth / 2;
      texture += `<path class="shv-w-float" d="M${fmt(x)} ${fmt(run.y + grid.ch * 0.2)}V${fmt(
        run.y + run.h - grid.ch * 0.2
      )}"/>`;
    }
  }
  if (kind === "rib") {
    // Рельеф резинки: тень на границе приподнятого столбика и впадины.
    for (let i = 1; i < grid.cols; i += 4) {
      const x = (i + 1) * grid.cw;
      texture += `<path class="shv-w-relief" d="M${fmt(x)} 0V${fmt(grid.height)}"/>`;
    }
  }

  return (
    `<g class="shv-w-under" fill="${r.warp}">${under.join("")}</g>` +
    `<g class="shv-w-shade" fill="${WARP_SHADE}">${under.join("")}</g>` +
    `<g class="shv-w-weft" fill="${r.weft}">${weft}</g>` +
    `<g class="shv-w-warp" fill="${r.warp}">${warp}</g>` +
    `<g class="shv-w-shade" fill="${WARP_SHADE}">${warp}</g>` +
    (texture ? `<g class="shv-w-texture">${texture}</g>` : "")
  );
};

/**
 * Бархат: уток полностью скрыт под основой, сверху только ворс.
 *
 * Столбики чуть разной светлоты дают вертикальные полосы ворса.
 */
const paintVelvet = (grid: Grid, r: Resolved): string => {
  let weft = "";
  for (let j = -1; j <= grid.rows; j++) {
    weft += thread(-grid.cw, j * grid.ch, grid.width + grid.cw * 2, grid.ch);
  }

  let warp = "";
  let nap = "";
  let light = "";
  for (let i = 0; i < grid.cols; i++) {
    const x = i * grid.cw;
    const column = `<rect x="${fmt(x)}" y="${fmt(-grid.ch)}" width="${fmt(grid.cw)}" height="${fmt(
      grid.ch * (grid.rows + 2)
    )}"/>`;
    warp += column;
    // Через столбик чуть светлее: вертикальные полосы ворса.
    if (i % 2 === 1) light += column;
    // Штрихи ворса вдоль столбика.
    for (const k of [0.25, 0.5, 0.75]) {
      const nx = x + grid.cw * k;
      nap += `<path class="shv-w-nap" d="M${fmt(nx)} 0V${fmt(grid.height)}"/>`;
    }
  }

  return (
    `<g class="shv-w-weft" fill="${r.weft}">${weft}</g>` +
    `<g class="shv-w-warp" fill="${r.warp}">${warp}</g>` +
    `<g class="shv-w-shade" fill="${NAP_LIGHT}">${light}</g>` +
    `<g class="shv-w-shade" fill="${WARP_SHADE}">${warp}</g>` +
    `<g class="shv-w-texture">${nap}</g>`
  );
};

/**
 * Трикотаж: вертикальные столбики петель, между ними ряды дуг утка.
 *
 * Дуги идут зигзагом: чётные ряды провисают вниз, нечётные — вверх.
 */
const paintKnit = (grid: Grid, r: Resolved): string => {
  const waleWidth = grid.cw * PLANS.knit.warpRatio;
  const center = (i: number): number => i * grid.cw + grid.cw / 2;

  let loops = "";
  for (let j = -1; j <= grid.rows; j++) {
    const y = j * grid.ch + grid.ch * 0.5;
    const down = j % 2 === 0;
    for (let i = -1; i <= grid.cols; i++) {
      const x0 = center(i);
      const x1 = center(i + 1);
      const peak = down ? y + grid.ch * 0.38 : y - grid.ch * 0.38;
      loops += `<path class="shv-w-loop" d="M${fmt(x0)} ${fmt(y)}Q${fmt((x0 + x1) / 2)} ${fmt(
        peak
      )} ${fmt(x1)} ${fmt(y)}"/>`;
    }
  }

  let wales = "";
  for (let i = 0; i < grid.cols; i++) {
    const x = i * grid.cw + (grid.cw - waleWidth) / 2;
    wales += thread(x, -grid.ch, waleWidth, grid.ch * (grid.rows + 2));
  }

  // Галочки на столбиках — петли трикотажа.
  let stitches = "";
  for (let j = 0; j < grid.rows; j++) {
    for (let i = 0; i < grid.cols; i++) {
      const cx = center(i);
      const y = j * grid.ch + grid.ch * 0.16;
      stitches += `<path class="shv-w-nap" d="M${fmt(cx - waleWidth / 2)} ${fmt(y)}L${fmt(cx)} ${fmt(
        y + grid.ch * 0.4
      )}L${fmt(cx + waleWidth / 2)} ${fmt(y)}"/>`;
    }
  }

  return (
    `<g class="shv-w-loop" stroke="${r.weft}">${loops}</g>` +
    `<g class="shv-w-warp" fill="${r.warp}">${wales}</g>` +
    `<g class="shv-w-shade" fill="${WARP_SHADE}">${wales}</g>` +
    `<g class="shv-w-texture">${stitches}</g>`
  );
};

/** Тело схемы: вид плетения выбирает способ отрисовки. */
const paintBody = (kind: WeaveKind, grid: Grid, r: Resolved): string => {
  if (kind === "knit") return paintKnit(grid, r);
  if (kind === "velvet") return paintVelvet(grid, r);
  return paintWoven(kind, grid, r);
};

/**
 * Кромка: плотная полоса вдоль левого и правого края полотна.
 *
 * В кромке нити основы не переплетаются с утком, а уходят в край: поэтому
 * полоса плотнее и темнее основного поля, а по внутренней границе идёт
 * волосяная линия. Выноска «Кромка» указывает именно на неё.
 */
const paintSelvedge = (grid: Grid, r: Resolved): string => {
  const width = Math.max(6, grid.cw * 0.9);
  const parts: string[] = [];

  for (const x of [0, grid.width - width]) {
    // Полотно кромки: та же нить основы, но лежит плотнее и с тенью.
    const band =
      `<rect class="shv-w-selvedge-band" x="${fmt(x)}" y="0" width="${fmt(width)}" ` +
      `height="${fmt(grid.height)}" fill="${r.warp}"/>` +
      `<rect class="shv-w-selvedge-shade" x="${fmt(x)}" y="0" width="${fmt(width)}" ` +
      `height="${fmt(grid.height)}"/>`;

    // Нити кромки идут вдоль полотна плотнее, чем в основном поле.
    let threads = "";
    for (let t = x + 1.5; t < x + width - 0.5; t += 2) {
      threads += `<path class="shv-w-selvedge-thread" d="M${fmt(t)} 0V${fmt(grid.height)}"/>`;
    }

    // Внутренняя граница кромки: по ней нити уходят в край.
    const inner = x === 0 ? width : grid.width - width;
    const edge = `<path class="shv-w-selvedge-edge" d="M${fmt(inner)} 0V${fmt(grid.height)}"/>`;

    parts.push(band + threads + edge);
  }

  return `<g class="shv-w-selvedge">${parts.join("")}</g>`;
};

/**
 * Диагональ саржи: тонкие линии под 45°, показывающие направление узора.
 *
 * Саржа сдвигает переплетение на нить в каждом ряду, поэтому полосы «основа
 * сверху» идут по диагонали снизу вверх. Линии проведены по центру полосы:
 * в клетках сетки это x/cw + y/ch = 0.5 (mod period).
 */
const paintDiagonal = (grid: Grid): string => {
  const period = PLANS.twill.period;
  const step = period * grid.cw;
  const phase = grid.cw * (0.5 - grid.height / grid.ch);
  const offset = ((phase % step) + step) % step;
  // Длина линии по горизонтали: шаг под 45° в клетках сетки.
  const run = grid.height * (grid.cw / grid.ch);

  const first = Math.floor((0 - grid.height - offset) / step) - 1;
  const last = Math.ceil((grid.width - offset) / step) + 1;

  const lines: string[] = [];
  for (let k = first; k <= last; k++) {
    const x = offset + k * step;
    lines.push(
      `<path class="shv-w-diagonal-line" d="M${fmt(x)} ${fmt(grid.height)}L${fmt(x + run)} 0"/>`
    );
  }

  return `<g class="shv-w-diagonal">${lines.join("")}</g>`;
};

/**
 * Большая иллюстрация плетения: основа (вертикаль) и уток (горизонталь),
 * над/под по типу ткани.
 *
 * Поверх полотна идут два слоя: кромка по краям и диагональ саржи. Они
 * нарисованы отдельными группами, чтобы легенда могла подсветить именно их.
 */
export function renderWeaveSvg(kind: WeaveKind, options?: WeaveOptions): string {
  const r = resolve(options, {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    threads: DEFAULT_THREADS,
  });
  const grid = bigGrid(r);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(r.width)} ${fmt(r.height)}" ` +
    `role="img" aria-label="${escapeXml(WEAVE_LABEL[kind])}">${THREAD_STYLE}${CANVAS_STYLE}` +
    `<rect class="shv-w-bg" x="0" y="0" width="${fmt(r.width)}" height="${fmt(r.height)}"/>` +
    paintBody(kind, grid, r) +
    (kind === "twill" ? paintDiagonal(grid) : "") +
    paintSelvedge(grid, r) +
    `<rect class="shv-w-frame" x="0.75" y="0.75" width="${fmt(r.width - 1.5)}" height="${fmt(
      r.height - 1.5
    )}" rx="10"/>` +
    `</svg>`
  );
}

/**
 * Маленькая бесшовная плитка узора для CSS-фона.
 *
 * Без фона и рамки: плитка должна ложиться на фон страницы. Нити выходят за
 * края, поэтому при повторе стыков не видно.
 */
export function renderWeaveTile(kind: WeaveKind, options?: WeaveOptions): string {
  const r = resolve(options, {
    width: TILE_SIZE,
    height: TILE_SIZE,
    threads: TILE_THREADS,
  });
  const grid = tileGrid(kind, r);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(r.width)} ${fmt(r.height)}" ` +
    `width="${fmt(r.width)}" height="${fmt(r.height)}" aria-hidden="true">${THREAD_STYLE}` +
    paintBody(kind, grid, r) +
    `</svg>`
  );
}
