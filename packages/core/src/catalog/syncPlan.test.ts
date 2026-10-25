import { describe, expect, it } from "vitest";
import { planSync } from "./syncPlan";

describe("planSync", () => {
  it("удаляет то, чего нет в сидах", () => {
    expect(planSync(["a", "b", "c"], ["a", "c", "d"])).toEqual({
      toDelete: ["b"],
      toKeep: ["a", "c"],
    });
  });

  it("пустые сиды — ошибка, а не очистка", () => {
    expect(() => planSync(["a"], [])).toThrow(/пусты/);
  });

  it("дубли в сидах — ошибка", () => {
    expect(() => planSync([], ["a", "a"])).toThrow(/повторя/);
  });

  it("запись, которой нет в БД, ничего не удаляет", () => {
    expect(planSync([], ["a", "b"])).toEqual({ toDelete: [], toKeep: [] });
  });

  it("дубли в БД не приводят к повторному удалению", () => {
    expect(planSync(["a", "a", "b"], ["a"])).toEqual({ toDelete: ["b"], toKeep: ["a"] });
  });
});
