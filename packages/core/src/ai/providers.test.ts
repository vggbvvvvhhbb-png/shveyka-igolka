import { describe, it, expect } from "vitest";
import {
  resolveProviderName,
  resolveProviderUrl,
  DEFAULT_RELAY_BASE_URL,
  DEFAULT_RELAY_MODEL,
  PROVIDER_URLS,
} from "./providers";

describe("resolveProviderName", () => {
  it("узнаёт известных провайдеров", () => {
    expect(resolveProviderName("relay")).toBe("relay");
    expect(resolveProviderName("openrouter")).toBe("openrouter");
    expect(resolveProviderName("anthropic")).toBe("anthropic");
    expect(resolveProviderName("kimi")).toBe("kimi");
  });

  it("неизвестное и пустое значение дают kimi", () => {
    expect(resolveProviderName(undefined)).toBe("kimi");
    expect(resolveProviderName("")).toBe("kimi");
    expect(resolveProviderName("что-то другое")).toBe("kimi");
  });
});

describe("resolveProviderUrl", () => {
  it("у провайдеров без базового адреса URL фиксированный", () => {
    expect(resolveProviderUrl("kimi")).toBe(PROVIDER_URLS.kimi);
    expect(resolveProviderUrl("openrouter")).toBe(PROVIDER_URLS.openrouter);
    expect(resolveProviderUrl("anthropic")).toBe(PROVIDER_URLS.anthropic);
  });

  it("relay собирает адрес из базового", () => {
    expect(resolveProviderUrl("relay")).toBe(`${DEFAULT_RELAY_BASE_URL}/v1/chat/completions`);
    expect(resolveProviderUrl("relay", "https://my-proxy.dev")).toBe(
      "https://my-proxy.dev/v1/chat/completions"
    );
  });

  it("хвостовой слэш у базового адреса убирается", () => {
    expect(resolveProviderUrl("relay", "https://my-proxy.dev/")).toBe(
      "https://my-proxy.dev/v1/chat/completions"
    );
  });

  it("пустая база не ломает адрес", () => {
    expect(resolveProviderUrl("relay", "   ")).toBe(
      `${DEFAULT_RELAY_BASE_URL}/v1/chat/completions`
    );
  });
});

describe("модель relay по умолчанию", () => {
  it("задана и не пустая", () => {
    expect(DEFAULT_RELAY_MODEL.length).toBeGreaterThan(0);
  });
});
