/**
 * Калькулятор «Сколько нужно фурнитуры» — список покупок к изделию.
 *
 * Модуль чистый: без React и без БД — его переиспользует и сайт, и бот.
 */

export type HwGarment = "dress" | "skirt" | "pants" | "shirt" | "blouse" | "jacket" | "coat";

/** Тип застёжки. */
export type Closure = "buttons" | "zipper" | "snaps" | "ties";

export const HW_GARMENT_LABELS: Record<HwGarment, string> = {
  dress: "Платье",
  skirt: "Юбка",
  pants: "Брюки",
  shirt: "Рубашка",
  blouse: "Блузка",
  jacket: "Пиджак",
  coat: "Пальто",
};

export const CLOSURE_LABELS: Record<Closure, string> = {
  buttons: "Пуговицы",
  zipper: "Молния",
  snaps: "Кнопки",
  ties: "Завязки",
};

export interface HardwareInput {
  garment: HwGarment;
  /** Размер: обычно 44–56. */
  size: number;
  closure: Closure;
  longSleeve: boolean;
  collar: boolean;
  /** Количество карманов на пуговицах. */
  pockets: number;
  hood: boolean;
  elasticWaist: boolean;
  elasticCuffs: boolean;
  /** Оверлок для обработки срезов. */
  overlock: boolean;
  /** Контрастная отделочная строчка. */
  contrastTopstitch: boolean;
  /** Цвет ткани — подсказываем нитки в тон. */
  fabricColor?: string;
}

export interface HwItem {
  id: string;
  name: string;
  qty: string;
  note?: string;
  /** Примерный диапазон цены, ₽. */
  price: [number, number];
}

/** Число пуговиц на основных деталях при размере 48. */
const MAIN_BUTTONS: Record<HwGarment, number> = {
  dress: 6,
  skirt: 4,
  pants: 1,
  shirt: 7,
  blouse: 6,
  jacket: 3,
  coat: 5,
};

/** Рекомендуемый диаметр пуговиц. */
const BUTTON_DIAMETER: Record<HwGarment, string> = {
  dress: "1,5 см",
  skirt: "1,5 см",
  pants: "2 см",
  shirt: "1,2–1,5 см",
  blouse: "1,2–1,5 см",
  jacket: "2 см",
  coat: "2,5 см",
};

/** Число с запятой вместо точки: «0,75 м» вместо «0.75 м». */
function meters(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

/**
 * Собирает список нужной фурнитуры под изделие.
 */
export function buildHardware(i: HardwareInput): HwItem[] {
  const items: HwItem[] = [];
  const sizeStep = Math.max(0, Math.round((i.size - 48) / 4)); // +1 на каждые ~4 размера
  const hasSleeves = !["skirt", "pants"].includes(i.garment);
  const cuffs = i.longSleeve && ["shirt", "blouse", "dress"].includes(i.garment);

  // --- Пуговицы ---
  const main = i.closure === "buttons" ? MAIN_BUTTONS[i.garment] + sizeStep : 0;
  const cuffButtons = cuffs && !i.elasticCuffs ? 4 : 0; // по 2 на рукав × 2
  const pocketButtons = i.closure === "buttons" ? i.pockets : 0;
  const buttonsTotal = main + cuffButtons + pocketButtons;
  if (buttonsTotal > 0) {
    const spare = 2;
    const parts = [
      main && `основные ${main}`,
      cuffButtons && `манжеты ${cuffButtons}`,
      pocketButtons && `карманы ${pocketButtons}`,
      `запас ${spare}`,
    ].filter(Boolean);
    items.push({
      id: "buttons",
      name: `Пуговицы (диаметр ${BUTTON_DIAMETER[i.garment]})`,
      qty: `${buttonsTotal + spare} шт`,
      note: parts.join(" + "),
      price: [(buttonsTotal + spare) * 8, (buttonsTotal + spare) * 25],
    });
  }

  // --- Кнопки (термо/пришивные) ---
  if (i.closure === "snaps") {
    const n = Math.max(4, MAIN_BUTTONS[i.garment]);
    items.push({
      id: "snaps",
      name: "Кнопки (пары)",
      qty: `${n + 2} шт`,
      note: `${n} + 2 запас`,
      price: [(n + 2) * 5, (n + 2) * 15],
    });
  }

  // --- Молния ---
  if (i.closure === "zipper") {
    const step = Math.max(0, Math.round((i.size - 48) / 2));
    let len: number;
    let kind: string;
    let note: string;
    switch (i.garment) {
      case "dress":
        len = 55 + step + 5;
        kind = "потайная";
        note = `длина спинки ${55 + step} см + 5 см`;
        break;
      case "pants":
        len = i.size >= 52 ? 20 : 18;
        kind = "брючная";
        note = "для брюк 18–20 см";
        break;
      case "skirt":
        len = i.size >= 52 ? 18 : 16;
        kind = "потайная";
        note = "для юбки 15–18 см";
        break;
      case "coat":
        len = 75 + step;
        kind = "разъёмная";
        note = "по длине переда";
        break;
      case "jacket":
        len = 55 + step;
        kind = "разъёмная";
        note = "по длине переда";
        break;
      default:
        len = 35 + step;
        kind = "обычная";
        note = "по длине разреза";
    }
    items.push({
      id: "zipper",
      name: `Молния ${kind}`,
      qty: `${len} см`,
      note,
      price: [60, 150],
    });
  }

  // --- Завязки ---
  if (i.closure === "ties") {
    items.push({
      id: "ties",
      name: "Тесьма / лента для завязок",
      qty: "1,5 м",
      price: [40, 120],
    });
  }

  // --- Косая бейка ---
  let bias = 0;
  if (i.garment === "dress") bias = i.longSleeve ? 1.5 : 2;
  else if (i.garment === "skirt") bias = 1;
  else if (i.garment === "blouse" && !i.collar) bias = 1.5;
  if (bias > 0) {
    items.push({
      id: "bias",
      name: "Косая бейка",
      qty: `${meters(bias)} м`,
      note: "для горловины и пройм, в тон ткани",
      price: [30, 80],
    });
  }

  // --- Нитки ---
  const heavy = i.garment === "coat" || i.garment === "jacket";
  const colorHint = i.fabricColor?.trim()
    ? `в тон ткани («${i.fabricColor.trim()}»)`
    : "в тон ткани (подбирай на свету)";
  items.push({
    id: "thread-main",
    name: "Нитки основные",
    qty: `${heavy ? 2 : 1} катушк${heavy ? "и" : "а"} (по 100 м)`,
    note: colorHint,
    price: [40, 120],
  });
  if (i.overlock) {
    items.push({
      id: "thread-overlock",
      name: "Нитки для оверлока",
      qty: "4 катушки",
      note: colorHint,
      price: [120, 400],
    });
  }
  if (i.contrastTopstitch) {
    items.push({
      id: "thread-contrast",
      name: "Нитки для отделочных строчек",
      qty: "1 катушка контрастного цвета",
      price: [40, 120],
    });
  }

  // --- Резинки ---
  const waist = 76 + (i.size - 48) * 2; // примерный обхват талии по размеру
  if (i.elasticWaist && ["skirt", "pants", "dress"].includes(i.garment)) {
    items.push({
      id: "elastic-waist",
      name: "Резинка для пояса",
      qty: `${waist + 2} см`,
      note: `обхват талии ~${waist} см + 2 см`,
      price: [30, 90],
    });
  }
  if (i.elasticCuffs && hasSleeves && i.longSleeve) {
    items.push({
      id: "elastic-cuffs",
      name: "Резинка для манжет",
      qty: "2 × 19 см",
      note: "обхват запястья ~17 см + 2 см",
      price: [20, 60],
    });
  }

  // --- Крючки и петли ---
  const hooks =
    (["skirt", "pants"].includes(i.garment) && i.closure === "zipper") ||
    (["jacket", "coat"].includes(i.garment) && i.collar);
  if (hooks) {
    items.push({
      id: "hooks",
      name: "Крючок + петля",
      qty: "1 комплект",
      note: "для пояса / воротника",
      price: [15, 50],
    });
  }

  // --- Капюшон ---
  if (i.hood) {
    items.push({
      id: "cord",
      name: "Шнур для капюшона + 2 люверса",
      qty: "1,2 м",
      price: [60, 160],
    });
  }

  // --- Дублирин / флизелин ---
  let interfacing = 0;
  const reasons: string[] = [];
  if (i.collar) {
    interfacing += 0.25;
    reasons.push("воротник");
  }
  if (cuffs && !i.elasticCuffs) {
    interfacing += 0.25;
    reasons.push("манжеты");
  }
  if (heavy) {
    interfacing += 0.5;
    reasons.push("подборта и перед");
  }
  if (["skirt", "pants"].includes(i.garment) && !i.elasticWaist) {
    interfacing += 0.2;
    reasons.push("пояс");
  }
  if (interfacing > 0) {
    items.push({
      id: "interfacing",
      name: "Дублирин / флизелин",
      qty: `${meters(interfacing)} м`,
      note: reasons.join(", "),
      price: [Math.round(interfacing * 120), Math.round(interfacing * 300)],
    });
  }

  return items;
}

/**
 * Текст списка покупок для магазина — без того, что уже есть дома.
 */
export function shoppingText(items: HwItem[], haveIds: string[]): string {
  const need = items.filter((x) => !haveIds.includes(x.id));
  if (need.length === 0) return "Всё уже есть дома 🎉";
  return need.map((x) => `☐ ${x.name} — ${x.qty}${x.note ? ` (${x.note})` : ""}`).join("\n");
}

/**
 * Примерная стоимость покупки: от и до, ₽.
 */
export function estimateTotal(items: HwItem[], haveIds: string[]): [number, number] {
  return items
    .filter((x) => !haveIds.includes(x.id))
    .reduce<[number, number]>((acc, x) => [acc[0] + x.price[0], acc[1] + x.price[1]], [0, 0]);
}
