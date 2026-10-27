import { describe, expect, it } from "vitest";
import type { MetadataRoute } from "next";
import robots from "./robots";

/**
 * Список закрытых адресов из robots.txt.
 *
 * `rules` в типе Next.js — объединение объекта и массива объектов, поэтому
 * приводим к общему виду явно.
 */
function closedPaths(result: MetadataRoute.Robots): string[] {
  const rules = result.rules;
  const one = Array.isArray(rules) ? rules[0] : rules;
  const disallow = one?.disallow;
  if (disallow === undefined) return [];
  return Array.isArray(disallow) ? disallow : [disallow];
}

describe("robots.txt", () => {
  it("закрывает личные страницы от индексации", () => {
    // Список личных страниц зафиксирован в docs/solutions/03-seo.md:
    // рассинхрон с документом — это молча вернуть личные данные в индекс.
    const closed = closedPaths(robots());

    expect(closed).toContain("/api/");
    expect(closed).toContain("/journal");
    expect(closed).toContain("/measurements");
    expect(closed).toContain("/owner");
    expect(closed).toContain("/assistant/history");
  });

  it("указывает адрес sitemap", () => {
    expect(robots().sitemap).toContain("/sitemap.xml");
  });
});
