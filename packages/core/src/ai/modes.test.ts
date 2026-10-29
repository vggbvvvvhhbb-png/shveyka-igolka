import { describe, expect, it } from "vitest";
import { ANSWER_MODES, isAnswerMode, maxTokensFor, modeInstruction } from "./modes";

describe("режимы ответа", () => {
  it("известный режим принимается, неизвестный — нет", () => {
    expect(isAnswerMode("steps")).toBe(true);
    expect(isAnswerMode("short")).toBe(true);
    expect(isAnswerMode("why")).toBe(true);
    expect(isAnswerMode("x")).toBe(false);
    expect(isAnswerMode(null)).toBe(false);
    expect(isAnswerMode(7)).toBe(false);
  });

  it("у каждого режима свой бюджет токенов", () => {
    expect(maxTokensFor("short")).toBe(700);
    expect(maxTokensFor("steps")).toBe(3200);
    expect(maxTokensFor("why")).toBe(3000);
    expect(maxTokensFor(null)).toBe(3000);
  });

  it("по шагам бюджет не меньше, чем в режиме «Почему»", () => {
    // Оба режима развёрнутые: обрезанный пошаговый ответ бесполезен.
    expect(maxTokensFor("steps")).toBeGreaterThanOrEqual(maxTokensFor("why"));
  });

  it("режим без выбора не добавляет инструкцию", () => {
    expect(modeInstruction(null)).toBe("");
    expect(modeInstruction("steps")).toContain("По шагам");
  });

  it("список режимов состоит из трёх значений", () => {
    expect([...ANSWER_MODES]).toEqual(["short", "steps", "why"]);
  });
});
