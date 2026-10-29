import { describe, expect, it } from "vitest";
import { missingWebModeEnv, webModesConfigured, WEB_MODE_ENV } from "./webConfig";

describe("missingWebModeEnv", () => {
  it("обе переменные на месте — ничего не missing", () => {
    expect(missingWebModeEnv({ EXA_API_KEY: "exa", APINEX_API_KEY: "apinex" })).toEqual([]);
  });

  it("без ключа поиска — называем его", () => {
    expect(missingWebModeEnv({ APINEX_API_KEY: "apinex" })).toEqual(["EXA_API_KEY"]);
  });

  it("без ключа моделей — называем его", () => {
    expect(missingWebModeEnv({ EXA_API_KEY: "exa" })).toEqual(["APINEX_API_KEY"]);
  });

  it("пустая строка считается отсутствующим ключом", () => {
    expect(missingWebModeEnv({ EXA_API_KEY: "   ", APINEX_API_KEY: "apinex" })).toEqual([
      "EXA_API_KEY",
    ]);
  });

  it("значения ключей в список не попадают", () => {
    const missing = missingWebModeEnv({ EXA_API_KEY: "exa", APINEX_API_KEY: "" });
    expect(missing).not.toContain("exa");
    expect(missing.every((name) => WEB_MODE_ENV.includes(name as "EXA_API_KEY"))).toBe(true);
  });
});

describe("webModesConfigured", () => {
  it("настроено, когда оба ключа на месте", () => {
    expect(webModesConfigured({ EXA_API_KEY: "exa", APINEX_API_KEY: "apinex" })).toBe(true);
  });

  it("не настроено, когда ключа нет", () => {
    expect(webModesConfigured({ EXA_API_KEY: "exa" })).toBe(false);
    expect(webModesConfigured({})).toBe(false);
  });
});
