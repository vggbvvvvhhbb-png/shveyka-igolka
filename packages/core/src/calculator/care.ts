/**
 * Уход за тканью: разбираем состав и собираем инструкцию как на бирке,
 * только подробнее.
 *
 * Модуль чистый: без React и без БД — его переиспользует и сайт, и бот.
 */

/** Волокно в составе ткани. */
export type Fiber = "cotton" | "linen" | "wool" | "silk" | "synthetic" | "viscose" | "elastane";

export type CareDensity = "light" | "medium" | "heavy";

export type CareGarment = "dress" | "skirt" | "pants" | "shirt" | "jacket" | "coat" | "other";

export const FIBER_LABELS: Record<Fiber, string> = {
  cotton: "хлопок",
  linen: "лён",
  wool: "шерсть",
  silk: "шёлк",
  synthetic: "синтетика",
  viscose: "вискоза",
  elastane: "эластан",
};

export const CARE_DENSITY_LABELS: Record<CareDensity, string> = {
  light: "Тонкая",
  medium: "Средняя",
  heavy: "Плотная",
};

export const CARE_GARMENT_LABELS: Record<CareGarment, string> = {
  dress: "Платье",
  skirt: "Юбка",
  pants: "Брюки",
  shirt: "Рубашка",
  jacket: "Пиджак",
  coat: "Пальто",
  other: "Другое",
};

export interface FiberShare {
  fiber: Fiber;
  /** Доля волокна в процентах. */
  percent: number;
}

// ---------- Разбор состава из текста ----------

const KEYWORDS: [RegExp, Fiber][] = [
  [/хлоп/i, "cotton"],
  [/л[её]н/i, "linen"],
  [/шерст|мерино|кашемир/i, "wool"],
  [/ш[её]лк/i, "silk"],
  [/полиэст|нейлон|полиамид|акрил|синтет/i, "synthetic"],
  [/вискоз|модал|тенсел/i, "viscose"],
  [/эластан|спандекс|лайкр/i, "elastane"],
];

/**
 * Разбирает состав ткани из текста.
 *
 * Понимает оба порядка: «Шерсть 80% + акрил 20%» и «80% шерсть, 20% акрил».
 * Если процентов нет, волокна делятся поровну.
 */
export function parseComposition(text: string): FiberShare[] {
  const out: FiberShare[] = [];
  const numberFirst = /^\s*\d/.test(text);
  const re = numberFirst ? /(\d{1,3})\s*%\s*([а-яё]+)/gi : /([а-яё]+)\s*(\d{1,3})\s*%/gi;

  for (const m of text.matchAll(re)) {
    const percent = Number(numberFirst ? m[1] : m[2]);
    const word = numberFirst ? m[2] : m[1];
    const hit = KEYWORDS.find(([r]) => r.test(word));
    if (hit) out.push({ fiber: hit[1], percent });
  }

  // «шерстяное пальто», «лён» — проценты не указаны
  if (out.length === 0) {
    const found = KEYWORDS.filter(([r]) => r.test(text)).map(([, f]) => f);
    for (const fiber of found) {
      out.push({ fiber, percent: Math.round(100 / found.length) });
    }
  }
  return out;
}

// ---------- Правила по волокнам ----------

const MODE_ORDER = ["normal", "delicate", "hand", "dryclean"] as const;
const SPIN_ORDER = ["yes", "low", "no"] as const;
const BLEACH_ORDER = ["yes", "oxygen", "no"] as const;
type Mode = (typeof MODE_ORDER)[number];
type Spin = (typeof SPIN_ORDER)[number];
type Bleach = (typeof BLEACH_ORDER)[number];

interface Rule {
  /** Температура стирки, °C. */
  temp: number;
  mode: Mode;
  spin: Spin;
  bleach: Bleach;
  machineDry: boolean;
  radiator: boolean;
  sun: boolean;
  /** Точки на утюге: 1 — низкая температура, 3 — высокая. */
  ironDots: 1 | 2 | 3;
  steam: boolean;
  ironCloth: boolean;
}

const RULES: Record<Fiber, Rule> = {
  cotton: {
    temp: 40,
    mode: "normal",
    spin: "yes",
    bleach: "oxygen",
    machineDry: true,
    radiator: false,
    sun: true,
    ironDots: 3,
    steam: true,
    ironCloth: false,
  },
  linen: {
    temp: 40,
    mode: "normal",
    spin: "low",
    bleach: "oxygen",
    machineDry: false,
    radiator: false,
    sun: true,
    ironDots: 3,
    steam: true,
    ironCloth: false,
  },
  wool: {
    temp: 30,
    mode: "hand",
    spin: "no",
    bleach: "no",
    machineDry: false,
    radiator: false,
    sun: false,
    ironDots: 2,
    steam: true,
    ironCloth: true,
  },
  silk: {
    temp: 30,
    mode: "hand",
    spin: "no",
    bleach: "no",
    machineDry: false,
    radiator: false,
    sun: false,
    ironDots: 1,
    steam: false,
    ironCloth: true,
  },
  synthetic: {
    temp: 40,
    mode: "normal",
    spin: "low",
    bleach: "no",
    machineDry: false,
    radiator: false,
    sun: true,
    ironDots: 1,
    steam: false,
    ironCloth: true,
  },
  viscose: {
    temp: 30,
    mode: "delicate",
    spin: "low",
    bleach: "no",
    machineDry: false,
    radiator: false,
    sun: false,
    ironDots: 2,
    steam: false,
    ironCloth: true,
  },
  elastane: {
    temp: 30,
    mode: "delicate",
    spin: "low",
    bleach: "no",
    machineDry: false,
    radiator: false,
    sun: false,
    ironDots: 1,
    steam: false,
    ironCloth: true,
  },
};

/** Возвращает более строгий из двух вариантов. */
const stricter = <T extends string>(order: readonly T[], a: T, b: T): T =>
  order.indexOf(a) >= order.indexOf(b) ? a : b;

/**
 * Сводит правила всех волокон к самому строгому.
 *
 * В расчёт идут волокна с долей от 25%; если таких нет — самое крупное.
 */
function mergeRules(fibers: FiberShare[]): Rule {
  const sorted = [...fibers].sort((a, b) => b.percent - a.percent);
  let used = sorted.filter((f) => f.percent >= 25);
  if (used.length === 0) used = sorted.slice(0, 1);

  const rules = used.map((f) => RULES[f.fiber]);
  return rules.reduce<Rule>(mergeRule, rules[0]);
}

/** Сводит два правила в одно — к более строгому. */
function mergeRule(acc: Rule, r: Rule): Rule {
  return {
    temp: Math.min(acc.temp, r.temp),
    mode: stricter(MODE_ORDER, acc.mode, r.mode),
    spin: stricter(SPIN_ORDER, acc.spin, r.spin),
    bleach: stricter(BLEACH_ORDER, acc.bleach, r.bleach),
    machineDry: acc.machineDry && r.machineDry,
    radiator: acc.radiator && r.radiator,
    sun: acc.sun && r.sun,
    ironDots: Math.min(acc.ironDots, r.ironDots) as 1 | 2 | 3,
    steam: acc.steam && r.steam,
    ironCloth: acc.ironCloth || r.ironCloth,
  };
}

// ---------- Результат ----------

export interface CareIconSpec {
  kind: "wash" | "bleach" | "tumble" | "iron" | "dryclean";
  /** Температура стирки для иконки. */
  temp?: number;
  /** Ручная стирка вместо машинной. */
  hand?: boolean;
  /** Точки на утюге. */
  dots?: number;
  /** Действие запрещено — рисуем перечёркнутый значок. */
  forbidden?: boolean;
  label: string;
}

export interface CareInput {
  fibers: FiberShare[];
  density: CareDensity;
  /** Ворс: бархат, велюр, махра. */
  pile: boolean;
  /** Рисунок: принт, вышивка. */
  print: boolean;
  garment: CareGarment;
}

export interface CareInstruction {
  title: string;
  wash: string[];
  dry: string[];
  iron: string[];
  storage: string[];
  repair: string[];
  warnings: string[];
  reminders: string[];
  icons: CareIconSpec[];
  /** Короткий текст для QR-кода на изделии. */
  qrText: string;
}

const DOT_TEMP = { 1: 110, 2: 150, 3: 200 } as const;

/**
 * Собирает инструкцию по уходу за тканью.
 *
 * Бросает ошибку, если состав не распознан: без волокон правила не собрать.
 */
export function generateCare(input: CareInput): CareInstruction {
  const { fibers, density, pile, print, garment } = input;
  if (fibers.length === 0) {
    throw new Error("Не удалось определить состав ткани");
  }

  const rule = { ...mergeRules(fibers) };
  const hasFiber = (f: Fiber) => fibers.some((x) => x.fiber === f);
  const outerwear = garment === "coat" || garment === "jacket";

  // модификаторы
  if (density === "heavy") {
    // Плотная ткань тяжелеет во время стирки: отжим мягче, сушить расправленной.
    rule.spin = stricter(SPIN_ORDER, rule.spin, "low");
  }
  if (pile) {
    rule.spin = "no";
    rule.machineDry = false;
  }
  if (print) {
    rule.bleach = "no";
    rule.sun = false;
  }

  const wash: string[] = [];
  if (rule.mode === "dryclean") {
    wash.push("Только химчистка.");
  } else {
    const modeText = {
      normal: "обычный",
      delicate: "деликатный",
      hand: "ручная стирка",
    }[rule.mode];
    wash.push(
      outerwear && rule.mode === "hand"
        ? `Лучше химчистка. Дома — только ручная стирка при ${rule.temp}° со специальным средством.`
        : `Температура ${rule.temp}°, режим: ${modeText}.`
    );
    wash.push(
      {
        yes: "Отжим: можно.",
        low: "Отжим: на низких оборотах.",
        no: "Отжим: не выкручивать, аккуратно отжать через полотенце.",
      }[rule.spin]
    );
    wash.push(
      {
        yes: "Отбеливание: можно.",
        oxygen: "Отбеливание: только кислородным отбеливателем.",
        no: "Отбеливание: нельзя.",
      }[rule.bleach]
    );
  }
  if (print) wash.push("Стирать наизнанку, чтобы не потёрся рисунок или вышивка.");

  const dry: string[] = [
    rule.machineDry
      ? "В сушильной машине: можно, на низкой температуре."
      : "В сушильной машине: нельзя.",
    rule.radiator ? "На батарее: можно, но лучше не стоит." : "На батарее: нельзя.",
    rule.sun ? "На солнце: можно." : "На солнце: нельзя — выгорает.",
  ];
  if (hasFiber("wool") || pile) {
    dry.unshift("Сушить в расправленном виде на горизонтальной поверхности.");
  }
  if (density === "heavy") {
    dry.unshift("Сушить в расправленном виде: тяжёлая ткань на плечиках растягивается.");
  }

  const iron: string[] = [
    `Температура утюга: ${"•".repeat(rule.ironDots)} (до ${DOT_TEMP[rule.ironDots]}°).`,
    rule.ironCloth
      ? hasFiber("wool")
        ? "Гладить через влажную марлю."
        : "Гладить через марлю или тонкую ткань."
      : "Через марлю не обязательно.",
    rule.steam ? "С паром — можно, лучше с паром." : "Без пара.",
  ];
  if (pile) iron.push("Гладить с изнанки на мягкой подложке, без нажима.");
  if (print) iron.push("Гладить с изнанки.");

  const storage: string[] = [];
  if (hasFiber("wool")) {
    storage.push("Хранить на широкой вешалке в чехле, положить средство от моли.");
  } else if (hasFiber("silk")) {
    storage.push("Хранить сложенным в хлопковой ткани, подальше от света.");
  } else if (outerwear || garment === "dress") {
    storage.push("Хранить на вешалке (плечики по размеру).");
  } else {
    storage.push("Хранить в сложенном виде на полке.");
  }
  storage.push("Не хранить во влажном месте: появится запах и плесень.");

  const repair: string[] = [];
  if (hasFiber("wool") || hasFiber("synthetic") || hasFiber("viscose")) {
    repair.push("Катышки: убирать специальной машинкой или аккуратно бритвой, не отрывать руками.");
  }
  if (hasFiber("wool")) {
    repair.push(
      "Восстановить форму: слегка увлажнить, расправить и высушить на горизонтальной поверхности."
    );
  } else if (hasFiber("cotton") || hasFiber("linen")) {
    repair.push("Восстановить форму и убрать заломы: отпарить или погладить слегка влажным.");
  }
  repair.push(
    "Пятна: не тереть, а промокать; сначала проверить средство на внутреннем шве. Свежее жирное пятно присыпать крахмалом или содой, потом стирать."
  );

  const warnings: string[] = [];
  if (hasFiber("wool") && !outerwear)
    warnings.push("Не стирать в машинке на горячей воде: сядет на 2–3 размера!");
  if (hasFiber("wool") && outerwear) warnings.push("Не стирать в машинке — сядет на 2–3 размера!");
  if (hasFiber("silk"))
    warnings.push("Не использовать пятновыводители с хлором и не тереть мокрый шёлк.");
  if (hasFiber("elastane"))
    warnings.push("Эластан не любит жары: горячая вода и утюг на максимуме убивают растяжимость.");

  const reminders: string[] = [];
  if (hasFiber("wool") && outerwear)
    reminders.push("Шерстяное пальто нужно проветривать раз в месяц.");
  if (hasFiber("wool")) reminders.push("Раз в сезон проверять вещь на моль.");
  if (outerwear || hasFiber("wool") || hasFiber("silk")) {
    reminders.push("Перед уборкой на летнее хранение почисти и проветри.");
  }

  // иконки
  const icons: CareIconSpec[] = [];
  if (rule.mode === "dryclean") {
    icons.push({ kind: "dryclean", label: "Химчистка" });
  } else {
    icons.push({
      kind: "wash",
      temp: rule.temp,
      hand: rule.mode === "hand",
      label: rule.mode === "hand" ? "Ручная стирка" : `Стирка ${rule.temp}°`,
    });
  }
  icons.push({
    kind: "bleach",
    forbidden: rule.bleach === "no",
    label: rule.bleach === "no" ? "Отбеливание нельзя" : "Отбеливание",
  });
  icons.push({
    kind: "tumble",
    forbidden: !rule.machineDry,
    label: rule.machineDry ? "Сушильная машина" : "Сушка в машине нельзя",
  });
  icons.push({ kind: "iron", dots: rule.ironDots, label: `Глажка ${DOT_TEMP[rule.ironDots]}°` });

  const title = `${fibers.map((f) => `${FIBER_LABELS[f.fiber]} ${f.percent}%`).join(" + ")}`;

  const qrText = [`Уход: ${title}`, wash.join(" "), dry.join(" "), iron.join(" ")]
    .join("\n")
    .slice(0, 400);

  return { title, wash, dry, iron, storage, repair, warnings, reminders, icons, qrText };
}
