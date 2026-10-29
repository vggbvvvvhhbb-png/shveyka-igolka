import { describe, expect, it } from "vitest";
import { MAX_CARDS_WITH_SETTINGS, collectRelatedCards, parseRelatedCards } from "./machineSettings";
import type { ContextEntry } from "./contextEntries";
import type { FabricContext, SeamContext } from "./contextSchema";

/** Запись ткани с заданными настройками. */
function fabric(slug: string, name: string, settings: Record<string, unknown>): ContextEntry {
  const data = {
    slug,
    name,
    aliases: [],
    category: "хлопок",
    weight_class: "средняя",
    stretch: "нет",
    suitable_for: [],
    default_machine_settings: settings,
    care_instructions: "",
    common_issues: [],
  } as unknown as FabricContext;

  return { kind: "fabric", slug, name, data };
}

/** Запись шва с заданными настройками. */
function seam(slug: string, name: string, settings: Record<string, unknown>): ContextEntry {
  const data = {
    slug,
    name,
    aliases: [],
    type: "стачивающий",
    difficulty: "средняя",
    suitable_weight_classes: [],
    when_to_use: "",
    default_machine_settings: settings,
    steps: [],
    common_mistakes: [],
  } as unknown as SeamContext;

  return { kind: "seam", slug, name, data };
}

const JEANS_SETTINGS = {
  needle_type: "jeans",
  needle_size: "90/14",
  thread_weight: "40-50 wt",
  thread_material: "polyester",
  stitch_type: "straight",
  stitch_length_mm: [2.5, 3],
  top_tension: [3, 4],
  presser_foot: "standard",
};

describe("collectRelatedCards", () => {
  it("собирает настройки ткани в строки", () => {
    const [card] = collectRelatedCards([fabric("denim", "Джинса", JEANS_SETTINGS)]);

    expect(card.label).toBe("Джинса");
    expect(card.href).toBe("/fabrics/denim");
    expect(card.settings.map((row) => row.label)).toEqual([
      "Игла",
      "Нить",
      "Строчка",
      "Натяжение нити",
      "Лапка",
    ]);
    expect(card.settings[0].value).toBe("90/14 (джинсовая)");
    expect(card.settings[1].value).toBe("40-50 wt, полиэстер");
    expect(card.settings[2].value).toBe("прямой стежок, длина стежка 2,5–3 мм");
    expect(card.settings[3].value).toBe("3–4");
    expect(card.settings[4].value).toBe("стандартная");
  });

  it("у шва адрес ведёт в раздел швов", () => {
    const [card] = collectRelatedCards([seam("overlock", "Оверлок", JEANS_SETTINGS)]);

    expect(card.href).toBe("/seams/overlock");
  });

  it("числа пишутся с десятичной запятой", () => {
    const [card] = collectRelatedCards([fabric("silk", "Шёлк", { stitch_length_mm: [2, 2.5] })]);

    expect(card.settings[0].value).toBe("длина стежка 2–2,5 мм");
  });

  it("одиночное значение не превращается в диапазон", () => {
    const [card] = collectRelatedCards([fabric("plain", "Ситец", { stitch_length_mm: 2.5 })]);

    expect(card.settings[0].value).toBe("длина стежка 2,5 мм");
  });

  it("запись без настроек остаётся карточкой, но без строк настроек", () => {
    const [card] = collectRelatedCards([fabric("none", "Без настроек", {})]);

    expect(card.label).toBe("Без настроек");
    expect(card.settings).toEqual([]);
  });

  it("проект остаётся карточкой: у проектов настроек нет", () => {
    const project: ContextEntry = {
      kind: "project",
      slug: "jumpsuit",
      name: "Комбинезон",
      data: {} as never,
    };

    const [card] = collectRelatedCards([project]);

    expect(card.href).toBe("/projects/jumpsuit");
    expect(card.settings).toEqual([]);
  });

  it("пустой контекст даёт пустой список", () => {
    expect(collectRelatedCards([])).toEqual([]);
  });

  it("неизвестные значения не теряются, а остаются как есть", () => {
    const [card] = collectRelatedCards([
      fabric("weird", "Необычная", { presser_foot: "special_foot" }),
    ]);

    expect(card.settings[0].value).toBe("special foot");
  });

  it("настройки показываются только у первых записей: карточка не превращается в таблицу", () => {
    const cards = collectRelatedCards([
      fabric("one", "Первая", JEANS_SETTINGS),
      fabric("two", "Вторая", JEANS_SETTINGS),
      fabric("three", "Третья", JEANS_SETTINGS),
    ]);

    expect(cards[0].settings.length).toBeGreaterThan(0);
    expect(cards[1].settings.length).toBeGreaterThan(0);
    expect(cards[2].settings).toEqual([]);
    expect(MAX_CARDS_WITH_SETTINGS).toBe(2);
  });
});

describe("parseRelatedCards", () => {
  it("карточки разбираются обратно из заголовка", () => {
    const cards = collectRelatedCards([fabric("denim", "Джинса", JEANS_SETTINGS)]);

    expect(parseRelatedCards(JSON.stringify(cards))).toEqual(cards);
  });

  it("экранированный заголовок с русскими названиями разбирается", () => {
    const cards = collectRelatedCards([fabric("denim", "Джинса", JEANS_SETTINGS)]);
    const header = encodeURIComponent(JSON.stringify(cards));

    // Заголовок должен остаться байтовой строкой: иначе сервер его не примет.
    const isAscii = [...header].every((char) => char.charCodeAt(0) < 128);
    expect(isAscii).toBe(true);
    expect(parseRelatedCards(header)).toEqual(cards);
  });

  it("битый заголовок не ломает ответ", () => {
    expect(parseRelatedCards(null)).toEqual([]);
    expect(parseRelatedCards("")).toEqual([]);
    expect(parseRelatedCards("не json")).toEqual([]);
    expect(parseRelatedCards('{"label":"Джинса"}')).toEqual([]);
  });

  it("битые настройки не ломают карточку", () => {
    const raw = JSON.stringify([
      { label: "Джинса", href: "/fabrics/denim", settings: [{ label: 5 }, "мусор"] },
    ]);

    expect(parseRelatedCards(raw)).toEqual([
      { label: "Джинса", href: "/fabrics/denim", settings: [] },
    ]);
  });

  it("внешние адреса карточками не становятся", () => {
    const raw = JSON.stringify([{ label: "Чужой сайт", href: "https://example.com" }]);

    expect(parseRelatedCards(raw)).toEqual([]);
  });
});
