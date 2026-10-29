import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chat, LlmError, modelChain, parseModelChain, stripThinking } from "./llm";

/** Ответ провайдера в формате OpenAI-совместимого API. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const OK_BODY = { choices: [{ message: { content: "Готово." } }] };

const MESSAGES = [{ role: "user" as const, content: "Какая игла?" }];

describe("parseModelChain", () => {
  it("разбирает список через запятую", () => {
    expect(parseModelChain("free/gpt-6-luna, free/minimax-m3-1-flash")).toEqual([
      "free/gpt-6-luna",
      "free/minimax-m3-1-flash",
    ]);
  });

  it("пустая строка и undefined дают пустой список", () => {
    expect(parseModelChain("")).toEqual([]);
    expect(parseModelChain(undefined)).toEqual([]);
  });

  it("пустые элементы отбрасываются", () => {
    expect(parseModelChain("a,,b,")).toEqual(["a", "b"]);
  });
});

describe("modelChain", () => {
  it("берёт цепочку по назначению", () => {
    const env = {
      MODELS_FAST: "f1,f2",
      MODELS_REASON: "r1",
      MODELS_NAVIGATOR: "n1",
    };
    expect(modelChain("fast", env)).toEqual(["f1", "f2"]);
    expect(modelChain("reason", env)).toEqual(["r1"]);
    expect(modelChain("navigator", env)).toEqual(["n1"]);
  });

  it("незаданная цепочка — пустая", () => {
    expect(modelChain("fast", {})).toEqual([]);
  });
});

describe("stripThinking", () => {
  it("вырезает блок <think>", () => {
    expect(stripThinking("<think>размышление</think>Ответ")).toBe("Ответ");
  });

  it("вырезает незакрытый блок до конца", () => {
    expect(stripThinking("<think>размышление без конца")).toBe("");
  });

  it("обычный текст не трогает", () => {
    expect(stripThinking("Ответ")).toBe("Ответ");
  });
});

describe("chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("APINEX_API_KEY", "test-key");
    // Пауза перед повтором не нужна: тест проверяет логику, а не ожидание.
    vi.stubEnv("LLM_RATE_LIMIT_BACKOFF_MS", "0");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("отвечает первой моделью цепочки", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(OK_BODY));

    const result = await chat({ models: ["m1", "m2"], messages: MESSAGES });

    expect(result.text).toBe("Готово.");
    expect(result.model).toBe("m1");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("в теле запроса — модель, сообщения и без потока", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(OK_BODY));

    await chat({ models: ["m1"], messages: MESSAGES, maxTokens: 321 });

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)) as {
      model: string;
      max_tokens: number;
      stream: boolean;
      messages: { role: string; content: string }[];
    };
    expect(body.model).toBe("m1");
    expect(body.max_tokens).toBe(321);
    expect(body.stream).toBe(false);
    expect(body.messages[0].content).toBe("Какая игла?");
  });

  it("упавшая модель → следующая из цепочки", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("нет такой модели", { status: 404 }))
      .mockResolvedValueOnce(jsonResponse(OK_BODY));

    const result = await chat({ models: ["m1", "m2"], messages: MESSAGES });

    expect(result.model).toBe("m2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("все модели вернули пустоту → LlmError", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ choices: [] }));

    await expect(chat({ models: ["m1", "m2"], messages: MESSAGES })).rejects.toBeInstanceOf(
      LlmError
    );
  });

  it("без ключа провайдера → LlmError", async () => {
    vi.stubEnv("APINEX_API_KEY", "");

    await expect(chat({ models: ["m1"], messages: MESSAGES })).rejects.toBeInstanceOf(LlmError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("пустая цепочка моделей → LlmError", async () => {
    await expect(chat({ models: [], messages: MESSAGES })).rejects.toBeInstanceOf(LlmError);
  });

  it("429 → пауза и повтор, затем успех", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("слишком часто", { status: 429 }))
      .mockResolvedValueOnce(jsonResponse(OK_BODY));

    const result = await chat({ models: ["m1"], messages: MESSAGES });

    expect(result.text).toBe("Готово.");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("429 держится → ошибка с кодом 429, на другую модель не переходим", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("слишком часто", { status: 429 }));

    await expect(chat({ models: ["m1", "m2"], messages: MESSAGES })).rejects.toMatchObject({
      status: 429,
    });
    // Первый запрос и два повтора. Вторая модель не пробуется: лимит общий.
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
