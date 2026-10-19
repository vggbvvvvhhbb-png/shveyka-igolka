import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./systemPrompt";
import { AssistantContextSchema, type AssistantContext } from "./contextSchema";

const emptyContext: AssistantContext = { fabrics: [], seams: [], projects: [] };

const filledContext: AssistantContext = {
  fabrics: [
    {
      slug: "denim",
      name: "Джинса",
      aliases: ["джинса"],
      category: "natural",
      weight_class: "heavy",
      stretch: "none",
      suitable_for: ["pants_simple"],
      default_machine_settings: { needle_type: "jeans" },
      care_instructions: "Стирка при 30°C",
      common_issues: ["Пропуски стежков"],
    },
  ],
  seams: [],
  projects: [],
};

describe("buildSystemPrompt", () => {
  it("includes the slug of a fabric from the context", () => {
    const prompt = buildSystemPrompt(filledContext);
    expect(prompt).toContain("denim");
    expect(prompt).toContain("Джинса");
  });

  it("states that no data is available when context is empty", () => {
    const prompt = buildSystemPrompt(emptyContext);
    expect(prompt).toContain("Подходящих записей не найдено");
  });

  it("instructs the model to answer only from context", () => {
    const prompt = buildSystemPrompt(emptyContext);
    expect(prompt).toContain("В каталоге Швейки этого нет");
  });
});

describe("AssistantContextSchema", () => {
  it("rejects more than 8 fabrics", () => {
    const fabric = filledContext.fabrics[0];
    const tooMany = { ...emptyContext, fabrics: Array(9).fill(fabric) };
    expect(AssistantContextSchema.safeParse(tooMany).success).toBe(false);
  });

  it("accepts an empty context", () => {
    expect(AssistantContextSchema.safeParse(emptyContext).success).toBe(true);
  });
});
