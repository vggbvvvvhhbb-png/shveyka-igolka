import { beforeEach, describe, expect, it } from "vitest";
import {
  describeProviderStatus,
  freeModelsNotice,
  isFreeModel,
  noteCheckInRequired,
  noteProviderFailure,
  noteProviderSuccess,
  providerStatus,
} from "./providerStatus";

/** Сбрасывает состояние провайдера между тестами. */
function reset(): void {
  const g = globalThis as unknown as { __shveykaProviderStatus?: unknown };
  g.__shveykaProviderStatus = undefined;
}

describe("isFreeModel", () => {
  it("модель бесплатного тарифа начинается с free/", () => {
    expect(isFreeModel("free/gpt-6-luna")).toBe(true);
    expect(isFreeModel("gpt-6-luna")).toBe(false);
  });
});

describe("состояние провайдера", () => {
  beforeEach(() => reset());

  it("изначально провайдер ничего не сообщил", () => {
    const status = providerStatus();
    expect(status.checkInRequired).toBe(false);
    expect(status.lastModel).toBeNull();
    expect(status.lastErrorModel).toBeNull();
  });

  it("после ответа модели видно, какая модель ответила", () => {
    noteProviderSuccess("free/gpt-6-luna");
    const status = providerStatus();
    expect(status.lastModel).toBe("free/gpt-6-luna");
    expect(status.lastSuccessAt).not.toBeNull();
  });

  it("проверка помечается, и в заметке об этом сказано прямо", () => {
    noteCheckInRequired("free/gpt-6-luna");
    const status = providerStatus();
    expect(status.checkInRequired).toBe(true);
    expect(status.lastErrorStatus).toBe(402);
    expect(freeModelsNotice(status)).toContain("Бесплатные модели");
  });

  it("ответ свободной модели снимает требование проверки", () => {
    noteCheckInRequired("free/gpt-6-luna");
    noteProviderSuccess("free/qwen-3.8-max");
    expect(providerStatus().checkInRequired).toBe(false);
    expect(freeModelsNotice()).toBeNull();
  });

  it("ответ платной модели требование проверки не снимает", () => {
    noteCheckInRequired("free/gpt-6-luna");
    noteProviderSuccess("gpt-6-luna");
    expect(providerStatus().checkInRequired).toBe(true);
  });

  it("ошибка провайдера сохраняется с кодом", () => {
    noteProviderFailure("free/gpt-6-luna", 500);
    const status = providerStatus();
    expect(status.lastErrorModel).toBe("free/gpt-6-luna");
    expect(status.lastErrorStatus).toBe(500);
  });
});

describe("describeProviderStatus", () => {
  beforeEach(() => reset());

  it("без событий разбор всё равно читаем", () => {
    const rows = describeProviderStatus();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((row) => row.label)).toContain("Бесплатные модели");
  });

  it("при требовании проверки строка называет платные модели", () => {
    noteCheckInRequired("free/gpt-6-luna");
    const row = describeProviderStatus().find((item) => item.label === "Бесплатные модели");
    expect(row?.ok).toBe(false);
    expect(row?.value).toContain("платные");
  });

  it("значения ключей в разбор не попадают", () => {
    noteProviderSuccess("free/gpt-6-luna");
    const text = describeProviderStatus()
      .map((row) => row.value)
      .join(" ");
    expect(text).not.toMatch(/sk-|Bearer/i);
  });
});
