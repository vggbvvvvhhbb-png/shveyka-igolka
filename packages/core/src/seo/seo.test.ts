import { describe, expect, it } from "vitest";
import { fabricJsonLd, howToJsonLd, readSteps, serializeJsonLd } from "./jsonld";
import { buildSitemap, normalizeBaseUrl } from "./sitemap";

describe("jsonld", () => {
  const steps = readSteps([
    { order: 2, title: "Строчка", description: "Прошейте", estimated_minutes: 5 },
    { order: 1, title: "Сколите", description: "Булавки", estimated_minutes: 3 },
    null,
    { foo: 1 },
  ]);

  it("шаги сортируются по order, мусор отбрасывается", () => {
    expect(steps.map((s) => s.title)).toEqual(["Сколите", "Строчка"]);
  });

  it("шаги шва читаются из instruction", () => {
    const seamSteps = readSteps([
      { order: 1, instruction: "Стачайте детали" },
      { order: 2, instruction: "Обработайте срез", tip: "Оверлок" },
    ]);
    expect(seamSteps.map((s) => s.description)).toEqual(["Стачайте детали", "Обработайте срез"]);
    expect(seamSteps[0].title).toBe("Стачайте детали");
  });

  it("HowTo: время и позиции", () => {
    const d = howToJsonLd({
      name: "Шов",
      description: "d",
      url: "https://x/s",
      steps,
      supplies: ["Нитки"],
    });
    expect(d?.totalTime).toBe("PT8M");
    expect((d?.step as { position: number }[]).map((s) => s.position)).toEqual([1, 2]);
  });

  it("без шагов HowTo не строится", () => {
    expect(howToJsonLd({ name: "n", description: "d", url: "u", steps: [] })).toBeNull();
  });

  it("сериализация не позволяет закрыть <script>", () => {
    const s = serializeJsonLd(
      fabricJsonLd({ name: "</script><b>", description: "", url: "u", aliases: [] })
    );
    expect(s).not.toContain("</script>");
    expect(s).toContain("\\u003c");
  });
});

describe("sitemap", () => {
  it("baseUrl: только http(s), без хвоста", () => {
    expect(normalizeBaseUrl("https://shveyka.ru/path/")).toBe("https://shveyka.ru");
    expect(normalizeBaseUrl("javascript:alert(1)")).toBe("http://localhost:3000");
    expect(normalizeBaseUrl(undefined)).toBe("http://localhost:3000");
  });

  it("собирает главную, статику и детальные страницы", () => {
    const e = buildSitemap("https://s.ru", {
      statics: ["/fabrics"],
      fabrics: ["a b"],
      seams: ["s"],
      projects: ["p"],
    });
    expect(e.map((x) => x.url)).toEqual([
      "https://s.ru/",
      "https://s.ru/fabrics",
      "https://s.ru/fabrics/a%20b",
      "https://s.ru/seams/s",
      "https://s.ru/projects/p",
    ]);
  });
});
