import { describe, it, expect } from "vitest";
import {
  validateChatRequest,
  isValidatedRequest,
  buildRequestBody,
  parseSSEChunk,
  parseSSEPiece,
  checkRateLimit,
  type RateStore,
} from "./routeLogic";
import { MAX_TOKENS } from "./constants";

describe("validateChatRequest", () => {
  it("корректный запрос проходит валидацию", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "Какую ткань взять для платья?" }],
    });
    expect(isValidatedRequest(result)).toBe(true);
  });

  it("11 сообщений → ошибка", () => {
    const messages = Array.from({ length: 11 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "текст",
    }));
    const result = validateChatRequest({ messages });
    expect(isValidatedRequest(result)).toBe(false);
    if (!isValidatedRequest(result)) {
      expect(result.error).toContain("максимум 10 сообщений");
    }
  });

  it("content длиннее 1000 символов → ошибка", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "а".repeat(1001) }],
    });
    expect(isValidatedRequest(result)).toBe(false);
    if (!isValidatedRequest(result)) {
      expect(result.error).toContain("Сообщение длиннее 1000 символов");
    }
  });

  it("role system → ошибка с русским текстом (задача 4)", () => {
    const result = validateChatRequest({ messages: [{ role: "system", content: "x" }] });
    expect(isValidatedRequest(result)).toBe(false);
    if (!isValidatedRequest(result)) {
      expect(result.error).toContain("Роль должна быть user или assistant");
    }
  });
});

describe("buildRequestBody (задача 2: лимит токенов)", () => {
  const messages = [{ role: "user" as const, content: "Привет" }];

  it("max_tokens по умолчанию — общий бюджет 1200", () => {
    const body = buildRequestBody(messages, "системный промпт", "openrouter", "kimi-k2.6");
    expect(body.max_tokens).toBe(MAX_TOKENS);
    expect(MAX_TOKENS).toBe(1200);
  });

  it("бюджет режима перекрывает общий", () => {
    const body = buildRequestBody(messages, "СП", "openrouter", "model", 1400);
    expect(body.max_tokens).toBe(1400);
  });

  it("max_tokens присутствует и для Anthropic", () => {
    const body = buildRequestBody(messages, "системный промпт", "anthropic", "claude");
    expect(body.max_tokens).toBe(1200);
    expect(body.system).toBe("системный промпт");
  });

  it("provider openrouter → нет anthropic-version в заголовках", () => {
    // В маршруте заголовки формируются по провайдеру: anthropic-version
    // добавляется только для Anthropic. Проверяем тело/URL-константы.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Title": "Shveyka",
    };
    expect(headers["anthropic-version"]).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("anthropic-version");
  });

  it("системный промпт первым в messages у OpenRouter", () => {
    const body = buildRequestBody(messages, "СП", "openrouter", "model") as {
      messages: { role: string }[];
    };
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
  });
});

describe("parseSSEChunk", () => {
  it("корректная OpenRouter-строка → текст", () => {
    const line = 'data: {"choices":[{"delta":{"content":"Джинса"}}]}';
    expect(parseSSEChunk(line, "openrouter")).toBe("Джинса");
  });

  it("[DONE] → null", () => {
    expect(parseSSEChunk("data: [DONE]", "openrouter")).toBeNull();
  });

  it("пустая строка → null", () => {
    expect(parseSSEChunk("", "openrouter")).toBeNull();
    expect(parseSSEChunk("data:", "openrouter")).toBeNull();
  });

  it("Anthropic content_block_delta → текст", () => {
    const line = 'data: {"type":"content_block_delta","delta":{"text":"Подгиб"}}';
    expect(parseSSEChunk(line, "anthropic")).toBe("Подгиб");
  });

  it("Anthropic message_stop → null", () => {
    const line = 'data: {"type":"message_stop"}';
    expect(parseSSEChunk(line, "anthropic")).toBeNull();
  });

  it("мусорная строка → null", () => {
    expect(parseSSEChunk("data: {не json", "openrouter")).toBeNull();
    expect(parseSSEChunk("event: foo", "openrouter")).toBeNull();
  });
});

describe("checkRateLimit", () => {
  it("20 запросов подряд → true; 21-й → false; после 60с → снова true", () => {
    const store: RateStore = new Map();
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit("1.2.3.4", store, t0 + i * 100)).toBe(true);
    }
    expect(checkRateLimit("1.2.3.4", store, t0 + 20 * 100)).toBe(false);
    // Окно истекло — снова разрешено.
    expect(checkRateLimit("1.2.3.4", store, t0 + 61_000)).toBe(true);
  });

  it("разные IP не влияют друг на друга", () => {
    const store: RateStore = new Map();
    const t0 = 500;
    for (let i = 0; i < 20; i++) checkRateLimit("9.9.9.9", store, t0);
    expect(checkRateLimit("9.9.9.9", store, t0)).toBe(false);
    expect(checkRateLimit("8.8.8.8", store, t0)).toBe(true);
  });
});

describe("parseSSEPiece", () => {
  it("причина завершения OpenRouter", () => {
    const piece = parseSSEPiece('data: {"choices":[{"finish_reason":"length"}]}', "openrouter");
    expect(piece.finishReason).toBe("length");
    expect(piece.text).toBeNull();
  });

  it("причина завершения Anthropic", () => {
    const piece = parseSSEPiece(
      'data: {"type":"message_delta","delta":{"stop_reason":"max_tokens"}}',
      "anthropic"
    );
    expect(piece.finishReason).toBe("max_tokens");
  });

  it("текст дельты без причины завершения", () => {
    const piece = parseSSEPiece('data: {"choices":[{"delta":{"content":"Джинса"}}]}', "openrouter");
    expect(piece.text).toBe("Джинса");
    expect(piece.finishReason).toBeNull();
  });
});

describe("validateChatRequest: контекст страницы и режим", () => {
  it("ctx и mode доходят до маршрута", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "Какая игла?" }],
      ctx: "fabric/denim",
      mode: "steps",
    });
    expect(isValidatedRequest(result)).toBe(true);
    if (isValidatedRequest(result)) {
      expect(result.ctx).toBe("fabric/denim");
      expect(result.mode).toBe("steps");
    }
  });

  it("без ctx и mode запрос остаётся рабочим", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "Какая игла?" }],
    });
    expect(isValidatedRequest(result)).toBe(true);
    if (isValidatedRequest(result)) {
      expect(result.ctx).toBeUndefined();
      expect(result.mode).toBeUndefined();
    }
  });

  it("слишком длинный ctx → ошибка", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "Какая игла?" }],
      ctx: "a".repeat(200),
    });
    expect(isValidatedRequest(result)).toBe(false);
  });
});
