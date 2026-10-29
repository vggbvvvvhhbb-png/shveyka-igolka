import { describe, expect, it } from "vitest";
import { heuristicPlan, parsePlan } from "./navigator";

describe("heuristicPlan", () => {
  it("вопрос без служебных слов становится запросом", () => {
    const plan = heuristicPlan("Как шить трикотаж?");
    expect(plan.queries).toEqual(["шить трикотаж"]);
    expect(plan.needWeb).toBe(true);
  });

  it("вопрос делится по «и», «или» и запятой", () => {
    const plan = heuristicPlan("Шить трикотаж и сатин, шить деним");
    expect(plan.queries.length).toBeGreaterThan(1);
  });

  it("запросов не больше трёх", () => {
    const plan = heuristicPlan("а, б, в, г, д, е");
    expect(plan.queries.length).toBeLessThanOrEqual(3);
  });

  it("пустой вопрос не даёт пустых запросов", () => {
    const plan = heuristicPlan("а");
    expect(plan.queries.every((query) => query.length > 0)).toBe(true);
  });
});

describe("parsePlan", () => {
  it("разбирает чистый JSON", () => {
    const plan = parsePlan('{"queries":["шить трикотаж"],"subqueries":["игла"],"needWeb":true}');
    expect(plan.queries).toEqual(["шить трикотаж"]);
    expect(plan.subqueries).toEqual(["игла"]);
    expect(plan.needWeb).toBe(true);
  });

  it("JSON в блоке кода тоже разбирается", () => {
    const plan = parsePlan('```json\n{"queries":["шить трикотаж"],"needWeb":true}\n```');
    expect(plan.queries).toEqual(["шить трикотаж"]);
  });

  it("JSON с пояснением вокруг — тоже", () => {
    const plan = parsePlan('Вот план: {"queries":["шить трикотаж"],"needWeb":true} Готово.');
    expect(plan.queries).toEqual(["шить трикотаж"]);
  });

  it("needWeb: false сохраняется", () => {
    const plan = parsePlan('{"queries":["какая игла"],"needWeb":false}');
    expect(plan.needWeb).toBe(false);
  });

  it("битый JSON → эвристический план по исходному вопросу", () => {
    const plan = parsePlan("не json вовсе", "Как шить трикотаж?");
    expect(plan.queries).toEqual(["шить трикотаж"]);
  });

  it("пустой ответ → план строится по вопросу", () => {
    const plan = parsePlan("", "Как шить деним?");
    expect(plan.queries).toEqual(["шить деним"]);
  });

  it("нуженWeb по умолчанию — правда", () => {
    const plan = parsePlan('{"queries":["шить"]}');
    expect(plan.needWeb).toBe(true);
  });
});
