import { describe, expect, it } from "vitest";
import { buildCatalogText } from "./catalogText";
import type { AssistantContext } from "./contextSchema";

const CONTEXT: AssistantContext = {
  fabrics: [
    {
      slug: "denim",
      name: "Джинсовая ткань",
      aliases: ["джинса"],
      category: "хлопок",
      weight_class: "плотная",
      stretch: "слабая",
      suitable_for: ["брюки", "юбка"],
      default_machine_settings: {
        needle_size: "80/12",
        stitch_type: "straight",
        stitch_length_mm: 3,
        top_tension: 4,
        presser_foot: "standard",
      },
      care_instructions: "Стирать при 30 градусах",
      common_issues: ["Катышки"],
    },
  ],
  seams: [
    {
      slug: "overlock",
      name: "Оверлочный шов",
      aliases: ["оверлок"],
      type: "обработка среза",
      difficulty: "средняя",
      suitable_weight_classes: ["средняя", "плотная"],
      when_to_use: "Когда нужно обработать срез",
      default_machine_settings: {
        needle_size: "80/12",
        stitch_type: "overlock",
      },
      steps: [
        { order: 1, instruction: "Настроить ширину обрезки" },
        { order: 2, instruction: "Обметать срез" },
      ],
      common_mistakes: ["Тянуть ткань"],
    },
  ],
  projects: [
    {
      slug: "frock",
      name: "Домашний халат",
      category: "дом",
      garment_type: "халат",
      difficulty: "простой",
      estimated_time_hours: [2, 3],
      fabric_amount_formula: "2,5 м",
      required_seams: ["overlock"],
      final_checklist: ["Проверить длину рукавов"],
    },
  ],
};

describe("buildCatalogText", () => {
  it("пустой каталог даёт пустой текст", () => {
    expect(buildCatalogText({ fabrics: [], seams: [], projects: [] })).toBe("");
  });

  it("ткань попадает в текст с настройками машины", () => {
    const text = buildCatalogText(CONTEXT);
    expect(text).toContain("Ткани:");
    expect(text).toContain("Джинсовая ткань");
    expect(text).toContain("Игла 80/12");
    expect(text).toContain("прямой стежок");
    expect(text).toContain("брюки, юбка");
  });

  it("блоки текста заканчиваются точками", () => {
    const text = buildCatalogText(CONTEXT);
    expect(text).toContain("лапка: стандартная.");
    expect(text).toContain("Уход: Стирать при 30 градусах.");
  });

  it("шов попадает в текст с порядком работы", () => {
    const text = buildCatalogText(CONTEXT);
    expect(text).toContain("Швы:");
    expect(text).toContain("Оверлочный шов");
    expect(text).toContain("Настроить ширину обрезки");
  });

  it("проект попадает в текст со временем и проверкой", () => {
    const text = buildCatalogText(CONTEXT);
    expect(text).toContain("Проекты:");
    expect(text).toContain("Домашний халат");
    expect(text).toContain("2–3 ч");
    expect(text).toContain("Проверить длину рукавов");
  });

  it("каталог разделён на блоки", () => {
    const text = buildCatalogText(CONTEXT);
    expect(text).toContain("Ткани:");
    expect(text).toContain("Швы:");
    expect(text).toContain("Проекты:");
  });
});
