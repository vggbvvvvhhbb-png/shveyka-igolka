import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dedupeSources, exaSearch, ExaError } from "./exa";
import type { Source } from "./source";

/** Источник с заданным адресом. */
function source(url: string, title = "Страница"): Source {
  return { title, url, snippet: "выдержка" };
}

describe("dedupeSources", () => {
  it("одинаковые страницы попадают в список один раз", () => {
    const result = dedupeSources(
      [
        source("https://example.com/page"),
        source("https://www.example.com/page/"),
        source("https://example.com/page?utm_source=x"),
      ],
      5
    );
    expect(result).toHaveLength(1);
  });

  it("порядок выдачи сохраняется", () => {
    const result = dedupeSources(
      [source("https://a.ru/1", "Первый"), source("https://b.ru/2", "Второй")],
      5
    );
    expect(result.map((s) => s.title)).toEqual(["Первый", "Второй"]);
  });

  it("список обрезается до лимита", () => {
    const result = dedupeSources(
      [source("https://a.ru/1"), source("https://b.ru/2"), source("https://c.ru/3")],
      2
    );
    expect(result).toHaveLength(2);
  });

  it("опасные схемы в список не попадают", () => {
    const result = dedupeSources(
      [source("javascript:alert(1)"), source("data:text/html,x"), source("https://ok.ru/")],
      5
    );
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://ok.ru/");
  });
});

describe("exaSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("EXA_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("превращает выдачу в источники", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: "Как шить трикотаж",
              url: "https://sewberi.ru/blog/trikotazh/",
              highlights: ["Сначала выберите иглу", "Потом настройте стежок"],
              publishedDate: "2025-03-12",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const results = await exaSearch("шить трикотаж");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Как шить трикотаж");
    expect(results[0].snippet).toBe("Сначала выберите иглу");
    expect(results[0].date).toBe("2025-03-12");
  });

  it("в запрос уходят только нужные поля", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    await exaSearch("шить трикотаж", { numResults: 3 });

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body.query).toBe("шить трикотаж");
    expect(body.numResults).toBe(3);
    expect(body.type).toBe("auto");
    expect(body.contents).toEqual({ highlights: true });
    expect(body.includeDomains).toBeUndefined();
    expect(body.category).toBeUndefined();
  });

  it("без ключа → ExaError", async () => {
    vi.stubEnv("EXA_API_KEY", "");

    await expect(exaSearch("шить трикотаж")).rejects.toBeInstanceOf(ExaError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ошибка провайдера → ExaError", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("ошибка", { status: 500 }));

    await expect(exaSearch("шить трикотаж")).rejects.toBeInstanceOf(ExaError);
  });

  it("результаты без адреса отбрасываются", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ title: "Без адреса" }, { title: "С адресом", url: "https://ok.ru/" }],
        }),
        { status: 200 }
      )
    );

    const results = await exaSearch("шить трикотаж");

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://ok.ru/");
  });
});
