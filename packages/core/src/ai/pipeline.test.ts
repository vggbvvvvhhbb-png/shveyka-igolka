import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exaSearch: vi.fn(),
  chat: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("./exa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./exa")>();
  return { ...actual, exaSearch: mocks.exaSearch };
});

vi.mock("./llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./llm")>();
  return { ...actual, chat: mocks.chat };
});

vi.mock("./navigator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./navigator")>();
  return { ...actual, navigate: mocks.navigate };
});

import { buildQuery, runPipeline } from "./pipeline";
import { ExaError } from "./exa";
import { SKILLS } from "./skills";
import type { Source } from "./source";

/** Источник для выдачи Exa. */
function source(url: string): Source {
  return { title: "Страница", url, snippet: "выдержка" };
}

const MODELS = { fast: ["fast-1"], reason: ["reason-1"], navigator: ["nav-1"] };

describe("buildQuery", () => {
  it("к вопросу про машину добавляется название машины", () => {
    const query = buildQuery("какая игла", "какая игла нужна для джинсы");
    expect(query).toContain("какая игла");
    expect(query).toContain("Brother LS-200s");
  });

  it("к общему вопросу название машины не добавляется", () => {
    const query = buildQuery("тренды лета", "какие ткани в тренде для лета");
    expect(query).toContain("тренды лета");
    expect(query).not.toContain("Brother");
  });

  it("лишние пробелы убираются", () => {
    expect(buildQuery("  шить   деним  ", "шить деним")).toBe("шить деним шитьё");
  });
});

describe("runPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chat.mockResolvedValue({ text: "Ответ.", model: "fast-1" });
    mocks.exaSearch.mockResolvedValue([source("https://a.ru/1"), source("https://b.ru/2")]);
    mocks.navigate.mockResolvedValue({
      queries: ["запрос один", "запрос два"],
      subqueries: [],
      needWeb: true,
    });
  });

  it("режим «Поиск» спрашивает интернет по плану и отдаёт источники", async () => {
    const result = await runPipeline(
      { mode: "search", question: "шить трикотаж", style: null, catalog: "Ткани: лён" },
      { models: MODELS }
    );

    expect(mocks.exaSearch).toHaveBeenCalledTimes(2);
    expect(result.sources).toHaveLength(2);
    expect(result.answer).toBe("Ответ.");
    expect(result.model).toBe("fast-1");
    expect(result.degraded).toBeNull();
    expect(result.steps).toContain("Ищу в интернете: 2");
  });

  it("режим «Поиск» спрашивает планировщик, чтобы запросы были точнее", async () => {
    await runPipeline(
      { mode: "search", question: "шить трикотаж", style: null, catalog: "" },
      { models: MODELS }
    );

    expect(mocks.navigate).toHaveBeenCalledTimes(1);
  });

  it("режим «Рассуждение» без интернета не ищет в нём", async () => {
    mocks.navigate.mockResolvedValue({ queries: ["какая игла"], subqueries: [], needWeb: false });

    const result = await runPipeline(
      {
        mode: "reason",
        question: "какая игла для джинсы",
        style: null,
        catalog: "Джинсовая ткань",
      },
      { models: MODELS }
    );

    expect(mocks.exaSearch).not.toHaveBeenCalled();
    expect(result.sources).toHaveLength(0);
    expect(result.steps).toContain("Планирую решение");
  });

  it("режим «Рассуждение» с интернетом ищет по плану", async () => {
    await runPipeline(
      {
        mode: "reason",
        question: "какая игла для джинсы",
        style: null,
        catalog: "Джинсовая ткань",
      },
      { models: MODELS }
    );

    expect(mocks.exaSearch).toHaveBeenCalledTimes(2);
    // Планировщик вернул два запроса — оба ушли в поиск.
    expect(mocks.exaSearch.mock.calls[0][0]).toContain("запрос один");
    expect(mocks.exaSearch.mock.calls[1][0]).toContain("запрос два");
  });

  it("режим «Ресёрч» спрашивает планировщик и ищет по его запросам", async () => {
    const result = await runPipeline(
      { mode: "research", question: "сравни ткани", style: null, catalog: "" },
      { models: MODELS }
    );

    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.exaSearch).toHaveBeenCalledTimes(2);
    expect(result.steps).toContain("Ищу в интернете: 2");
  });

  it("ошибка поиска не роняет режим: ответ только по каталогу", async () => {
    mocks.exaSearch.mockRejectedValue(new ExaError("поиск недоступен"));

    const result = await runPipeline(
      { mode: "search", question: "шить трикотаж", style: null, catalog: "Ткани: лён" },
      { models: MODELS }
    );

    expect(result.sources).toHaveLength(0);
    expect(result.degraded).toBe("Интернет недоступен — ответ только по каталогу");
    expect(result.answer).toBe("Ответ.");
  });

  it("в промт попадают каталог и источники", async () => {
    await runPipeline(
      { mode: "search", question: "шить трикотаж", style: null, catalog: "Ткани: лён" },
      { models: MODELS }
    );

    const messages = mocks.chat.mock.calls[0][0].messages as { role: string; content: string }[];
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("Ткани: лён");
    expect(system).toContain("Источники:");
    expect(system).toContain("https://a.ru/1");
  });

  it("режим ответа попадает в промт", async () => {
    await runPipeline(
      { mode: "search", question: "шить трикотаж", style: "short", catalog: "" },
      { models: MODELS }
    );

    const messages = mocks.chat.mock.calls[0][0].messages as { role: string; content: string }[];
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("Режим «Коротко»");
  });

  it("бюджет токенов берётся из навыка, а «Коротко» урезается", async () => {
    await runPipeline(
      { mode: "research", question: "сравни ткани", style: null, catalog: "" },
      { models: MODELS }
    );
    expect(mocks.chat.mock.calls[0][0].maxTokens).toBe(SKILLS.research.maxTokens);

    vi.clearAllMocks();
    mocks.chat.mockResolvedValue({ text: "Ответ.", model: "fast-1" });
    await runPipeline(
      { mode: "search", question: "шить трикотаж", style: "short", catalog: "" },
      { models: MODELS }
    );
    expect(mocks.chat.mock.calls[0][0].maxTokens).toBe(900);
  });

  it("в развёрнутом режиме модель думает глубже", async () => {
    await runPipeline(
      { mode: "research", question: "сравни ткани", style: null, catalog: "" },
      { models: MODELS }
    );
    expect(mocks.chat.mock.calls[0][0].reasoningEffort).toBe("high");

    vi.clearAllMocks();
    mocks.chat.mockResolvedValue({ text: "Ответ.", model: "fast-1" });
    await runPipeline(
      { mode: "search", question: "шить трикотаж", style: "short", catalog: "" },
      { models: MODELS }
    );
    // В коротком ответе размышление не помогает: человек просил одну мысль.
    expect(mocks.chat.mock.calls[0][0].reasoningEffort).toBeUndefined();
  });

  it("текст ответа приводится к читаемому виду", async () => {
    mocks.chat.mockResolvedValue({ text: "не перегревают ребёнка .", model: "fast-1" });

    const result = await runPipeline(
      { mode: "search", question: "шить трикотаж", style: null, catalog: "" },
      { models: MODELS }
    );

    expect(result.answer).toBe("не перегревают ребёнка.");
  });

  it("блок «Что спросить дальше» выносится из ответа отдельными вопросами", async () => {
    mocks.chat.mockResolvedValue({
      text: "Ответ.\n\nЧто спросить дальше:\n- Первый вопрос?\n- Второй вопрос?",
      model: "fast-1",
    });

    const result = await runPipeline(
      { mode: "search", question: "шить трикотаж", style: null, catalog: "" },
      { models: MODELS }
    );

    expect(result.answer).toBe("Ответ.");
    expect(result.followUps).toEqual(["Первый вопрос?", "Второй вопрос?"]);
  });
});
