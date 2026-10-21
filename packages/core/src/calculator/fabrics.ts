/**
 * Упрощённая база тканей для подбора аналога.
 *
 * Это не каталог Швейки (тот лежит в БД и богаче по настройкам машины),
 * а короткая шпаргалка для калькулятора: цена за метр, ширина, плотность
 * и свойства. Цены примерные — мама правит их под свои магазины.
 *
 * Модуль чистый: без React и без БД — его переиспользует и сайт, и бот.
 */

/** Группа волокон. */
export type FiberGroup = "cotton" | "linen" | "wool" | "silk" | "synthetic" | "viscose" | "blend";

/** Плотность ткани. */
export type Density = "light" | "medium" | "heavy";

/** Для какого изделия подходит ткань. */
export type Purpose = "dress" | "blouse" | "pants" | "coat" | "lining";

/** Сезон. */
export type Season = "summer" | "demi" | "winter";

/** Свойства ткани, важные при выборе. */
export type Trait = "no-itch" | "no-wrinkle" | "quick-dry" | "breathable" | "drape";

export const TRAIT_LABELS: Record<Trait, string> = {
  "no-itch": "Не колется",
  "no-wrinkle": "Не мнётся",
  "quick-dry": "Быстро сохнет",
  breathable: "Дышит",
  drape: "Красиво драпируется",
};

export const PURPOSE_LABELS: Record<Purpose, string> = {
  dress: "Платье",
  blouse: "Блузка",
  pants: "Брюки",
  coat: "Пальто",
  lining: "Подкладка",
};

export const SEASON_LABELS: Record<Season, string> = {
  summer: "Лето",
  demi: "Демисезон",
  winter: "Зима",
};

export const DENSITY_LABELS: Record<Density, string> = {
  light: "Тонкая",
  medium: "Средняя",
  heavy: "Плотная",
};

export const FIBER_GROUP_LABELS: Record<FiberGroup, string> = {
  cotton: "Хлопок",
  linen: "Лён",
  wool: "Шерсть",
  silk: "Шёлк",
  synthetic: "Синтетика",
  viscose: "Вискоза",
  blend: "Смесовая",
};

/** Карточка ткани из базы подбора аналога. */
export interface FabricOption {
  id: string;
  name: string;
  /** Синонимы — по ним ищет пользователь. */
  aliases: string[];
  composition: string;
  fiber: FiberGroup;
  density: Density;
  /** Плотность в г/м². */
  gsm: number;
  purposes: Purpose[];
  seasons: Season[];
  /** Цена за метр, ₽. Примерная. */
  price: number;
  /** Ширина рулона, см. */
  widthCm: number;
  traits: Trait[];
  pros: string;
  cons: string;
  /** Где купить. */
  shop?: string;
}

/** База тканей для калькулятора. Цены примерные — мама может их править. */
export const FABRIC_OPTIONS: FabricOption[] = [
  {
    id: "linen",
    name: "Лён 100%",
    aliases: ["лён", "лен", "льняная"],
    composition: "Лён 100%",
    fiber: "linen",
    density: "medium",
    gsm: 170,
    purposes: ["dress", "blouse", "pants"],
    seasons: ["summer"],
    price: 900,
    widthCm: 140,
    traits: ["breathable", "no-itch"],
    pros: "Дышит, прочный, отлично для жары",
    cons: "Сильно мнётся",
  },
  {
    id: "linen-cotton",
    name: "Лён + хлопок",
    aliases: ["смесовый лён", "лён хлопок"],
    composition: "Лён 55% + хлопок 45%",
    fiber: "blend",
    density: "medium",
    gsm: 160,
    purposes: ["dress", "blouse", "pants"],
    seasons: ["summer", "demi"],
    price: 650,
    widthCm: 140,
    traits: ["breathable", "no-itch"],
    pros: "Золотая середина: дышит, мнётся меньше льна",
    cons: "Всё равно требует глажки",
  },
  {
    id: "viscose",
    name: "Вискоза (штапель)",
    aliases: ["вискоза", "штапель"],
    composition: "Вискоза 100%",
    fiber: "viscose",
    density: "light",
    gsm: 120,
    purposes: ["dress", "blouse"],
    seasons: ["summer", "demi"],
    price: 550,
    widthCm: 140,
    traits: ["breathable", "drape", "no-itch"],
    pros: "Дышит, мягко драпируется, меньше мнётся",
    cons: "Не такая прочная, садится при стирке",
  },
  {
    id: "cotton-poplin",
    name: "Хлопок (поплин)",
    aliases: ["хлопок", "поплин"],
    composition: "Хлопок 100%",
    fiber: "cotton",
    density: "light",
    gsm: 120,
    purposes: ["dress", "blouse"],
    seasons: ["summer", "demi"],
    price: 450,
    widthCm: 150,
    traits: ["breathable", "no-itch"],
    pros: "Натуральный, лёгкий в уходе",
    cons: "Мнётся, даёт усадку",
  },
  {
    id: "cotton-poly",
    name: "Смесовая хлопок + полиэстер",
    aliases: ["смесовая", "хлопок полиэстер"],
    composition: "Хлопок 60% + полиэстер 40%",
    fiber: "blend",
    density: "light",
    gsm: 125,
    purposes: ["dress", "blouse", "pants"],
    seasons: ["summer", "demi"],
    price: 350,
    widthCm: 150,
    traits: ["no-wrinkle", "quick-dry", "breathable"],
    pros: "Дёшево, почти не мнётся, быстро сохнет",
    cons: "Дышит чуть хуже чистого хлопка",
  },
  {
    id: "cotton-stretch",
    name: "Хлопок + эластан (сатин стрейч)",
    aliases: ["сатин", "стрейч", "хлопок эластан"],
    composition: "Хлопок 96% + эластан 4%",
    fiber: "cotton",
    density: "medium",
    gsm: 190,
    purposes: ["dress", "pants", "blouse"],
    seasons: ["summer", "demi"],
    price: 500,
    widthCm: 140,
    traits: ["breathable"],
    pros: "Тянется, удобно сидит по фигуре",
    cons: "Не гладить на максимуме",
  },
  {
    id: "denim",
    name: "Джинсовая ткань",
    aliases: ["джинса", "деним"],
    composition: "Хлопок 98% + эластан 2%",
    fiber: "cotton",
    density: "heavy",
    gsm: 300,
    purposes: ["pants", "dress"],
    seasons: ["demi", "winter"],
    price: 700,
    widthCm: 150,
    traits: ["no-itch"],
    pros: "Очень прочная, носится годами",
    cons: "Плотная, сложнее шить",
  },
  {
    id: "wool-suit",
    name: "Шерсть 100% (костюмная)",
    aliases: ["шерсть", "костюмная"],
    composition: "Шерсть 100%",
    fiber: "wool",
    density: "medium",
    gsm: 250,
    purposes: ["pants", "dress", "coat"],
    seasons: ["demi", "winter"],
    price: 1800,
    widthCm: 150,
    traits: ["drape", "breathable"],
    pros: "Держит форму, греет, красиво выглядит",
    cons: "Дорогая, у некоторых колется, нужна химчистка",
  },
  {
    id: "wool-poly",
    name: "Шерсть + полиэстер (костюмная)",
    aliases: ["шерсть полиэстер"],
    composition: "Шерсть 50% + полиэстер 50%",
    fiber: "blend",
    density: "medium",
    gsm: 240,
    purposes: ["pants", "dress"],
    seasons: ["demi", "winter"],
    price: 1100,
    widthCm: 150,
    traits: ["no-wrinkle", "drape"],
    pros: "Дешевле шерсти, не мнётся, прочнее",
    cons: "Дышит хуже чистой шерсти",
  },
  {
    id: "drap",
    name: "Драп (шерсть + акрил)",
    aliases: ["драп", "пальтовая"],
    composition: "Шерсть 80% + акрил 20%",
    fiber: "wool",
    density: "heavy",
    gsm: 450,
    purposes: ["coat"],
    seasons: ["winter", "demi"],
    price: 1500,
    widthCm: 150,
    traits: [],
    pros: "Тёплый и плотный, держит форму",
    cons: "Тяжёлый, нужна химчистка",
  },
  {
    id: "coat-poly",
    name: "Пальтовая (полиэстер + шерсть 30%)",
    aliases: ["пальтовая смесовая"],
    composition: "Полиэстер 70% + шерсть 30%",
    fiber: "blend",
    density: "heavy",
    gsm: 400,
    purposes: ["coat"],
    seasons: ["winter", "demi"],
    price: 1100,
    widthCm: 150,
    traits: ["no-wrinkle", "no-itch"],
    pros: "Заметно дешевле драпа, не колется",
    cons: "Греет чуть хуже",
  },
  {
    id: "silk",
    name: "Шёлк 100% (креп)",
    aliases: ["шёлк", "шелк"],
    composition: "Шёлк 100%",
    fiber: "silk",
    density: "light",
    gsm: 80,
    purposes: ["dress", "blouse"],
    seasons: ["summer", "demi"],
    price: 2200,
    widthCm: 140,
    traits: ["breathable", "drape", "no-itch"],
    pros: "Роскошный вид и ощущение",
    cons: "Дорогой, капризный в шитье и уходе",
  },
  {
    id: "poly-crepe",
    name: "Полиэстер (креп)",
    aliases: ["полиэстер", "креп", "крепдешин"],
    composition: "Полиэстер 100%",
    fiber: "synthetic",
    density: "light",
    gsm: 110,
    purposes: ["dress", "blouse"],
    seasons: ["summer", "demi"],
    price: 400,
    widthCm: 150,
    traits: ["no-wrinkle", "quick-dry", "drape"],
    pros: "Дёшево, не мнётся, хорошо драпируется",
    cons: "Не дышит, может электризоваться",
  },
  {
    id: "lining",
    name: "Подкладка (вискоза + полиэстер)",
    aliases: ["подкладка", "подкладочная"],
    composition: "Вискоза 50% + полиэстер 50%",
    fiber: "blend",
    density: "light",
    gsm: 90,
    purposes: ["lining"],
    seasons: ["summer", "demi", "winter"],
    price: 250,
    widthCm: 140,
    traits: ["no-itch", "quick-dry"],
    pros: "Скользит, приятна к телу",
    cons: "Не для верхней ткани",
  },
];
