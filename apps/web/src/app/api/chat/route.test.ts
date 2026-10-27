import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Тест маршрута /api/chat.
 *
 * Проверяем две вещи, которые нельзя поймать в ядре: мерки владельца доходят
 * до системного промта и личный ответ не попадает в общий кэш ответов.
 */

const mocks = vi.hoisted(() => ({
  searchContext: vi.fn(),
  findContextEntry: vi.fn(),
  /** Ответ на вопрос «это владелец?» — переключается в тесте. */
  isOwner: false,
}));

vi.mock("@shveyka/db", () => ({
  getDbSingleton: () => ({}) as unknown,
  queries: {
    searchContext: mocks.searchContext,
    findContextEntry: mocks.findContextEntry,
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
  limitRequest: async () => null,
}));

vi.mock("@/lib/owner", () => ({
  requestIsOwner: () => mocks.isOwner,
}));

vi.mock("@/lib/chatHistory", () => ({
  saveUserTurn: async () => null,
  saveAssistantTurn: async () => undefined,
}));

/** Контекст каталога с мерками владельца. */
const CONTEXT_WITH_MEASUREMENTS = {
  fabrics: [],
  seams: [],
  projects: [],
  measurements: { bust: 92, waist: 74, hip: 98, height: 168 },
};

/** Контекст постороннего посетителя: мерок в нём нет. */
const CONTEXT_PUBLIC = { fabrics: [], seams: [], projects: [] };

/** Ответ провайдера в формате SSE, как у OpenAI-совместимых. */
function providerResponse(text: string): Response {
  const encoder = new TextEncoder();
  const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(chunk));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function chatRequest(question: string): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });
}

/** Тело запроса к провайдеру — в нём системный промт. */
function providerPrompt(call = 0): string {
  const body = vi.mocked(fetch).mock.calls[call]?.[1]?.body;
  const parsed = JSON.parse(String(body)) as { messages?: Array<{ content: string }> };
  return parsed.messages?.[0]?.content ?? "";
}

/**
 * Маршрут с пустым кэшем ответов.
 *
 * Кэш живёт в globalThis и общий для процесса, поэтому модуль маршрута
 * перезагружается перед каждым тестом.
 */
async function loadRoute(): Promise<(req: Request) => Promise<Response>> {
  vi.resetModules();
  const mod = await import("./route");
  return mod.POST;
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isOwner = false;
    mocks.searchContext.mockResolvedValue(CONTEXT_PUBLIC);
    mocks.findContextEntry.mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("AI_PROVIDER", "kimi");
    vi.stubEnv("KIMI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("мерки владельца попадают в системный промт", async () => {
    mocks.isOwner = true;
    mocks.searchContext.mockResolvedValue(CONTEXT_WITH_MEASUREMENTS);
    // Каждый вызов — новый Response: тело ответа читается только один раз.
    vi.mocked(fetch).mockImplementation(async () => providerResponse("Готово."));

    const POST = await loadRoute();
    const res = await POST(chatRequest("Сколько ткани нужно?"));
    await res.text();

    expect(res.status).toBe(200);
    const prompt = providerPrompt();
    expect(prompt).toContain("Мерки");
    expect(prompt).toContain("98");
  });

  it("ответ владельца с мерками не попадает в общий кэш", async () => {
    mocks.isOwner = true;
    mocks.searchContext.mockResolvedValue(CONTEXT_WITH_MEASUREMENTS);
    // Каждый вызов — новый Response: тело ответа читается только один раз.
    vi.mocked(fetch).mockImplementation(async () => providerResponse("Готово."));

    const POST = await loadRoute();
    await (await POST(chatRequest("Сколько ткани нужно?"))).text();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // Тот же вопрос задаёт посторонний: личный ответ отдавать ему нельзя,
    // поэтому провайдер вызывается снова, а не берётся копия из кэша.
    mocks.isOwner = false;
    mocks.searchContext.mockResolvedValue(CONTEXT_PUBLIC);
    await (await POST(chatRequest("Сколько ткани нужно?"))).text();

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("общий ответ без мерок кэшируется", async () => {
    // Каждый вызов — новый Response: тело ответа читается только один раз.
    vi.mocked(fetch).mockImplementation(async () => providerResponse("Готово."));

    const POST = await loadRoute();
    await (await POST(chatRequest("Какая игла для джинсы?"))).text();
    const second = await POST(chatRequest("Какая игла для джинсы?"));
    const text = await second.text();

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(text).toBe("Готово.");
  });
  // Импорт маршрута тянет рантайм Next.js и весь баррель ядра: под нагрузкой
  // (сразу все пакеты) импорт занимает несколько секунд, и стандартных пяти
  // не хватает. Таймаут сьюта — с запасом.
}, 30000);
