import { describe, expect, it } from "vitest";
import { prepareChat } from "./prepareChat";
import type { ContextEntry } from "./contextEntries";
import type { PageRef } from "./pageContext";

type E = ContextEntry;

const entry = (slug: string, name: string): E => ({
  kind: "fabric",
  slug,
  name,
  data: {
    slug,
    name,
    aliases: [],
    category: "natural",
    weight_class: "heavy",
    stretch: "none",
    suitable_for: [],
    default_machine_settings: {},
    care_instructions: "",
    common_issues: [],
  },
});

const denim = entry("denim", "Джинса");
const linen = entry("linen", "Лён");

const deps = {
  search: async (question: string) =>
    [denim, linen].filter((e) => question.toLowerCase().includes(e.name.toLowerCase())),
  entry: async (ref: PageRef) => (ref.kind === "fabric" && ref.slug === denim.slug ? denim : null),
  pool: [denim, linen].map((e) => ({ kind: "fabric" as const, slug: e.slug, name: e.name })),
};

describe("prepareChat", () => {
  it("страница подмешивается с приоритетом, режим даёт токены и инструкцию", async () => {
    const prepared = await prepareChat(deps, {
      question: "какая игла для лён",
      ctx: "fabric/denim",
      mode: "steps",
    });

    expect(prepared.context.map((e) => e.slug)).toEqual(["denim", "linen"]);
    expect(prepared.pinned?.slug).toBe("denim");
    expect(prepared.maxTokens).toBe(1400);
    expect(prepared.rules).toContain("По шагам");
  });

  it("несуществующая страница игнорируется", async () => {
    const prepared = await prepareChat(deps, { question: "про лён", ctx: "fabric/ghost" });

    expect(prepared.context.map((e) => e.slug)).toEqual(["linen"]);
    expect(prepared.pinned).toBeNull();
  });

  it("мусорный ctx не ломает сборку контекста", async () => {
    const prepared = await prepareChat(deps, { question: "про лён", ctx: "../../etc/passwd" });

    expect(prepared.context.map((e) => e.slug)).toEqual(["linen"]);
  });

  it("пустой контекст → блок с ближайшими записями", async () => {
    const prepared = await prepareChat(deps, { question: "как шить джинсу", ctx: undefined });

    expect(prepared.context).toEqual([]);
    expect(prepared.rules).toContain("slug: denim");
  });

  it("неизвестный режим трактуется как обычный ответ", async () => {
    const prepared = await prepareChat(deps, { question: "про лён", mode: "какая-то бредь" });

    expect(prepared.mode).toBeNull();
    expect(prepared.maxTokens).toBe(1200);
    expect(prepared.rules).toBe("");
  });

  it("контекст ограничен шестью записями", async () => {
    const many = Array.from({ length: 10 }, (_, i) => entry(`t${i}`, `Ткань${i}`));
    const prepared = await prepareChat(
      { ...deps, search: async () => many, pool: [] },
      { question: "ткань" }
    );

    expect(prepared.context).toHaveLength(6);
  });
});
