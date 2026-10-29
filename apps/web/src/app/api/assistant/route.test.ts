import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Тест маршрута /api/assistant.
 *
 * Проверяем то, что не видно в ядре: режим «Каталог» в этот маршрут не
 * попадает, ключи провайдеров проверяются до работы, а ответ уходит
 * в JSON вместе с источниками и ходом работы.
 */

const mocks = vi.hoisted(() => ({
  runPipeline: vi.fn(),
  searchContext: vi.fn(),
  findContextEntry: vi.fn(),
  getConversation: vi.fn(),
  listMessages: vi.fn(),
  saveUserTurn: vi.fn(),
  saveAssistantTurn: vi.fn(),
  limitRequest: vi.fn(),
}));

vi.mock("@shveyka/core/ai/pipeline", () => ({
  runPipeline: mocks.runPipeline,
}));

vi.mock("@shveyka/db", () => ({
  getDbSingleton: () => ({}) as unknown,
  queries: {
    searchContext: mocks.searchContext,
    findContextEntry: mocks.findContextEntry,
    getConversation: mocks.getConversation,
    listMessages: mocks.listMessages,
  },
}));

vi.mock("@/lib/catalog", () => ({
  loadCatalog: async () => ({
    rows: { fabric: [], seam: [], project: [] },
    graph: {},
    version: "1",
  }),
  poolOf: () => [],
}));

vi.mock("@/lib/guard", () => ({
  clientIp: () => "127.0.0.1",
  limitRequest: mocks.limitRequest,
}));

vi.mock("@/lib/owner", () => ({
  requestIsOwner: () => false,
}));

vi.mock("@/lib/chatHistory", () => ({
  saveUserTurn: mocks.saveUserTurn,
  saveAssistantTurn: mocks.saveAssistantTurn,
}));

/** Пустой контекст каталога. */
const EMPTY_CONTEXT = { fabrics: [], seams: [], projects: [] };

/** Ответ конвейера по умолчанию. */
const PIPELINE_RESULT = {
  answer: "Ответ по каталогу.",
  sources: [{ title: "Страница", url: "https://example.com/a", snippet: "выдержка" }],
  steps: ["Ищу в интернете", "Собираю ответ"],
  model: "free/gpt-6-luna",
  degraded: null,
};

function assistantRequest(body: unknown): Request {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Маршрут с чистыми модулями.
 *
 * Модуль маршрута перезагружается перед каждым тестом: состояние окружения
 * и моков не должно течь из одного теста в другой.
 */
async function loadRoute(): Promise<(req: Request) => Promise<Response>> {
  vi.resetModules();
  const mod = await import("./route");
  return mod.POST;
}

describe("POST /api/assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.limitRequest.mockResolvedValue(null);
    mocks.searchContext.mockResolvedValue(EMPTY_CONTEXT);
    mocks.findContextEntry.mockResolvedValue(null);
    mocks.getConversation.mockResolvedValue(undefined);
    mocks.listMessages.mockResolvedValue([]);
    mocks.saveUserTurn.mockResolvedValue("11111111-1111-1111-1111-111111111111");
    mocks.saveAssistantTurn.mockResolvedValue(undefined);
    mocks.runPipeline.mockResolvedValue(PIPELINE_RESULT);
    vi.stubEnv("EXA_API_KEY", "test-exa");
    vi.stubEnv("APINEX_API_KEY", "test-apinex");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("режим «Поиск» отдаёт ответ, источники и ход работы", async () => {
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "как шить трикотаж", mode: "search" }));
    const body = (await res.json()) as {
      answer: string;
      mode: string;
      sources: unknown[];
      steps: string[];
      model: string;
    };

    expect(res.status).toBe(200);
    expect(body.answer).toBe("Ответ по каталогу.");
    expect(body.mode).toBe("search");
    expect(body.sources).toHaveLength(1);
    expect(body.steps).toContain("Ищу в интернете");
    expect(body.model).toBe("free/gpt-6-luna");
  });

  it("вопрос и режим доходят до конвейера", async () => {
    const POST = await loadRoute();
    await POST(assistantRequest({ message: "какая игла", mode: "reason", style: "short" }));

    const input = mocks.runPipeline.mock.calls[0][0] as {
      question: string;
      mode: string;
      style: string | null;
    };
    expect(input.question).toBe("какая игла");
    expect(input.mode).toBe("reason");
    expect(input.style).toBe("short");
  });

  it("режим «Каталог» в этот маршрут не попадает", async () => {
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "какая игла", mode: "chat" }));

    expect(res.status).toBe(400);
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("неизвестный режим → 400", async () => {
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "какая игла", mode: "взлом" }));

    expect(res.status).toBe(400);
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("пустой вопрос → 400", async () => {
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "   ", mode: "search" }));

    expect(res.status).toBe(400);
  });

  it("без ключей провайдеров → 503 и никаких обращений к ним", async () => {
    vi.stubEnv("EXA_API_KEY", "");
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "какая игла", mode: "search" }));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(503);
    expect(body.error).toContain("не настроены");
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("без ключа модели — тоже 503", async () => {
    vi.stubEnv("APINEX_API_KEY", "");
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "какая игла", mode: "search" }));

    expect(res.status).toBe(503);
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("лимит провайдера → 429 с понятным текстом", async () => {
    const POST = await loadRoute();
    // Класс ошибки берём после загрузки маршрута: loadRoute пересоздаёт
    // модули, и ранее импортированный класс был бы чужеродным.
    const { LlmError } = await import("@shveyka/core/ai/llm");
    mocks.runPipeline.mockRejectedValue(new LlmError("лимит", "m1", 429));
    const res = await POST(assistantRequest({ message: "какая игла", mode: "search" }));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(429);
    expect(body.error).toContain("минуту");
  });

  it("ошибка конвейера → 500 без внутренних деталей", async () => {
    mocks.runPipeline.mockRejectedValue(new Error("connection refused at 10.0.0.1:5432"));
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "какая игла", mode: "search" }));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).not.toContain("5432");
  });

  it("отказ провайдера → 502", async () => {
    const POST = await loadRoute();
    const { LlmError } = await import("@shveyka/core/ai/llm");
    mocks.runPipeline.mockRejectedValue(new LlmError("модель не ответила", "m1", 404));
    const res = await POST(assistantRequest({ message: "какая игла", mode: "search" }));

    expect(res.status).toBe(502);
  });

  it("ответ сохраняется в истории вместе с режимом и источниками", async () => {
    const POST = await loadRoute();
    await POST(assistantRequest({ message: "какая игла", mode: "research" }));

    expect(mocks.saveAssistantTurn).toHaveBeenCalledTimes(1);
    const meta = mocks.saveAssistantTurn.mock.calls[0][6] as {
      mode: string;
      sources: unknown[];
    };
    expect(meta.mode).toBe("research");
    expect(meta.sources).toHaveLength(1);
  });

  it("превышение лимита → ответ ограничителя не заменяется", async () => {
    const limited = new Response("{}", { status: 429 });
    mocks.limitRequest.mockResolvedValue(limited);
    const POST = await loadRoute();
    const res = await POST(assistantRequest({ message: "какая игла", mode: "search" }));

    expect(res.status).toBe(429);
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });
});
