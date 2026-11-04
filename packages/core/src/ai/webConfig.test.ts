import { describe, expect, it } from "vitest";
import {
  describeWebServices,
  missingWebModeEnv,
  webModeCanAnswer,
  webModesConfigured,
  webServicesStatus,
  WEB_SERVICES,
} from "./webConfig";

describe("webServicesStatus", () => {
  it("обе службы на месте — обе готовы", () => {
    const status = webServicesStatus({ EXA_API_KEY: "exa", APINEX_API_KEY: "apinex" });
    expect(status.search).toBe("ready");
    expect(status.llm).toBe("ready");
    expect(status.missing).toEqual([]);
  });

  it("без ключа поиска — поиск помечен как отсутствующий, модели готовы", () => {
    const status = webServicesStatus({ APINEX_API_KEY: "apinex" });
    expect(status.search).toBe("missing");
    expect(status.llm).toBe("ready");
    expect(status.missing).toEqual(["EXA_API_KEY"]);
  });

  it("без ключа моделей — модели помечены как отсутствующие", () => {
    const status = webServicesStatus({ EXA_API_KEY: "exa" });
    expect(status.llm).toBe("missing");
    expect(status.missing).toEqual(["APINEX_API_KEY"]);
  });

  it("пустая строка считается отсутствующим ключом", () => {
    const status = webServicesStatus({ EXA_API_KEY: "   ", APINEX_API_KEY: "apinex" });
    expect(status.search).toBe("missing");
  });

  it("значения ключей в список не попадают", () => {
    const missing = missingWebModeEnv({ EXA_API_KEY: "exa", APINEX_API_KEY: "" });
    expect(missing).not.toContain("exa");
    expect(missing.every((name) => Object.values(WEB_SERVICES).includes(name as never))).toBe(true);
  });
});

describe("webModeCanAnswer", () => {
  it("без ключа поиска ответ всё равно возможен — по каталогу", () => {
    expect(webModeCanAnswer({ APINEX_API_KEY: "apinex" })).toBe(true);
  });

  it("без ключа моделей ответ невозможен", () => {
    expect(webModeCanAnswer({ EXA_API_KEY: "exa" })).toBe(false);
    expect(webModeCanAnswer({})).toBe(false);
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

describe("describeWebServices", () => {
  it("каждая служба получает понятное объяснение", () => {
    const rows = describeWebServices(webServicesStatus({ APINEX_API_KEY: "apinex" }));
    const search = rows.find((row) => row.label.includes("Поиск"));
    const llm = rows.find((row) => row.label.includes("Модели"));

    expect(search?.state).toBe("missing");
    expect(search?.text).toContain("только по каталогу");
    expect(llm?.state).toBe("ready");
    expect(llm?.text).toBe("ключ задан");
  });

  it("значений ключей в тексте нет", () => {
    const rows = describeWebServices(
      webServicesStatus({ EXA_API_KEY: "exa-secret", APINEX_API_KEY: "apinex-secret" })
    );
    expect(rows.map((row) => row.text).join(" ")).not.toContain("secret");
  });
});
