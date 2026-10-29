import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./systemPrompt";
import { SOFT_REFUSAL_RULE } from "./fallback";
import type { AssistantContext } from "./contextSchema";

/**
 * Промпт без мерок должен остаться ровно таким, каким был до появления блока
 * «Мерки». Поэтому ожидаемый текст зафиксирован здесь целиком: любая правка
 * инструкций заставит тест упасть и потребует осознанного решения.
 */
const INSTRUCTIONS_BEFORE_MEASUREMENTS = `Ты — консультант по шитью Швейка. Помогаешь с тканями, швами, проектами и настройками швейной машины Brother LS-200s.

Правила:
1. Отвечай только по данным из блока «Доступные данные». Не используй знания из других источников для параметров машины и свойств тканей.
2. ${SOFT_REFUSAL_RULE}
3. Не придумывай настройки машины (игла, стежок, натяжение) для тканей, которых нет в блоке.
4. Ссылайся на записи в формате markdown: [название](/fabrics/slug), [название](/seams/slug), [название](/projects/slug).
5. Отвечай по-русски. Для пошаговых инструкций используй нумерованный список.
6. Если вопрос не про шитьё, вежливо откажись и предложи вопрос по теме каталога.`;

/** Правила оформления: интерфейс разбирает разметку ответа. */
const FORMAT_RULES_TEXT = `Оформляй ответ разметкой — интерфейс её разбирает:
- короткие абзацы и списки вместо сплошного текста;
- заголовки разделов: ## Заголовок;
- выделение главного: **важное**;
- не начинай с вступлений вроде «Конечно!» и «Давайте разберёмся».`;

/** Структура обычного ответа по каталогу. */
const CATALOG_STRUCTURE_TEXT = `Структура ответа:
- ## Короткий ответ — 2–4 предложения: ответ по сути;
- ## Что делать — 2–4 конкретных шага, что настроить или сделать;
- ## Нюансы — 2–4 пункта, на что обратить внимание.
Называй конкретику из каталога: ткань и её плотность, номер иглы, нить, строчку, лапку.`;

/** Структура ответа в режиме «Почему». */
const CATALOG_WHY_STRUCTURE_TEXT = `Структура ответа:
- ## Ответ — 2–3 предложения: что рекомендуется;
- ## Почему так — 3–5 пунктов: почему именно эти настройки и эта ткань;
- ## Что делать — 2–3 конкретных шага.
Называй конкретику из каталога: ткань и её плотность, номер иглы, нить, строчку, лапку.`;

/** Блок вопросов в конце ответа — их интерфейс показывает кнопками. */
const FOLLOW_UP_RULES_TEXT = `В самом конце ответа добавь блок с вопросами — их покажут кнопками:
Что спросить дальше:
- вопрос одним предложением
- ещё один вопрос
- третий вопрос
Вопросы — короткие, по теме ответа, от лица человека, который спрашивает.`;

const EMPTY_CONTEXT: AssistantContext = { fabrics: [], seams: [], projects: [] };

describe("buildSystemPrompt", () => {
  it("без мерок промпт не меняется (инвариант)", () => {
    const prompt = buildSystemPrompt(EMPTY_CONTEXT);

    expect(prompt).toBe(`${INSTRUCTIONS_BEFORE_MEASUREMENTS}

${FORMAT_RULES_TEXT}

${CATALOG_STRUCTURE_TEXT}

${FOLLOW_UP_RULES_TEXT}

## Доступные данные
Подходящих записей не найдено. Блок данных пуст.`);
  });

  it("без мерок в промпте нет упоминаний мерок", () => {
    const prompt = buildSystemPrompt(EMPTY_CONTEXT);

    expect(prompt).not.toContain("Мерки");
    expect(prompt).not.toContain("fabric_amount_formula даёт длину отреза");
  });

  it("с данными без мерок блок данных остаётся прежним", () => {
    const context: AssistantContext = {
      fabrics: [
        {
          slug: "denim",
          name: "Джинса",
          aliases: ["джинса"],
          category: "natural",
          weight_class: "heavy",
          stretch: "none",
          suitable_for: ["pants_simple"],
          default_machine_settings: {},
          care_instructions: "Стирка при 30°C",
          common_issues: [],
        },
      ],
      seams: [],
      projects: [],
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt.startsWith(INSTRUCTIONS_BEFORE_MEASUREMENTS)).toBe(true);
    expect(prompt).toContain("## Доступные данные");
    expect(prompt).toContain('"slug": "denim"');
    expect(prompt).not.toContain("Мерки");
  });

  it("с мерками добавляется правило и блок мерок", () => {
    const context: AssistantContext = {
      ...EMPTY_CONTEXT,
      measurements: { waist: 74, height: 168 },
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain("В блоке «Мерки» указаны размеры пользователя");
    expect(prompt).toContain('"waist": 74');
    expect(prompt).toContain('"height": 168');
  });

  it("пустой объект мерок не добавляет правило", () => {
    const prompt = buildSystemPrompt({ ...EMPTY_CONTEXT, measurements: {} });

    expect(prompt).toBe(buildSystemPrompt(EMPTY_CONTEXT));
  });

  it("настройки машины дублируются словами", () => {
    const context: AssistantContext = {
      fabrics: [
        {
          slug: "denim",
          name: "Джинса",
          aliases: ["джинса"],
          category: "natural",
          weight_class: "heavy",
          stretch: "none",
          suitable_for: [],
          default_machine_settings: {
            needle_size: "80/12",
            stitch_type: "straight",
            stitch_length_mm: [2, 2.5],
          },
          care_instructions: "",
          common_issues: [],
        },
      ],
      seams: [],
      projects: [],
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain("## Настройки машины словами");
    expect(prompt).toContain(
      "Джинса: Игла 80/12 (метрический №80, американский №12), прямой стежок, длина стежка 2–2,5 мм."
    );
  });

  it("жёсткий отказ больше не упоминается", () => {
    expect(buildSystemPrompt(EMPTY_CONTEXT)).not.toContain("В каталоге Швейки этого нет");
  });

  it("обычный ответ состоит из разделов и вопросов для кнопок", () => {
    const prompt = buildSystemPrompt(EMPTY_CONTEXT);

    expect(prompt).toContain(CATALOG_STRUCTURE_TEXT);
    expect(prompt).toContain(FOLLOW_UP_RULES_TEXT);
  });

  it("в режиме «Коротко» нет ни разделов, ни вопросов", () => {
    const prompt = buildSystemPrompt(EMPTY_CONTEXT, "short");

    expect(prompt).not.toContain(CATALOG_STRUCTURE_TEXT);
    expect(prompt).not.toContain(FOLLOW_UP_RULES_TEXT);
    expect(prompt).not.toContain("## Короткий ответ");
  });

  it("в режиме «Почему» своя структура и вопросы остаются", () => {
    const prompt = buildSystemPrompt(EMPTY_CONTEXT, "why");

    expect(prompt).toContain(CATALOG_WHY_STRUCTURE_TEXT);
    expect(prompt).not.toContain(CATALOG_STRUCTURE_TEXT);
    expect(prompt).toContain(FOLLOW_UP_RULES_TEXT);
  });

  it("в режиме «По шагам» разделов нет, вопросы остаются", () => {
    const prompt = buildSystemPrompt(EMPTY_CONTEXT, "steps");

    expect(prompt).not.toContain(CATALOG_STRUCTURE_TEXT);
    expect(prompt).not.toContain(CATALOG_WHY_STRUCTURE_TEXT);
    expect(prompt).toContain(FOLLOW_UP_RULES_TEXT);
  });
});
