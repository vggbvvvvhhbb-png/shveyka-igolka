import { describe, expect, it } from "vitest";

import { validateContactRequest } from "./contacts";

describe("validateContactRequest", () => {
  it("принимает обращение с темой и текстом", () => {
    const result = validateContactRequest({
      topic: "suggestion",
      name: "Аня",
      contact: "anya@example.com",
      message: "Добавьте, пожалуйста, трикотаж в каталог тканей.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.topic).toBe("suggestion");
      expect(result.value.name).toBe("Аня");
      expect(result.value.message).toContain("трикотаж");
    }
  });

  it("убирает пустые необязательные поля", () => {
    const result = validateContactRequest({
      topic: "question",
      name: "   ",
      contact: "",
      message: "Как ухаживать за льном после стирки?",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBeUndefined();
      expect(result.value.contact).toBeUndefined();
    }
  });

  it("не принимает неизвестную тему", () => {
    const result = validateContactRequest({
      topic: "spam",
      message: "Позвоните мне прямо сейчас",
    });

    expect(result.ok).toBe(false);
  });

  it("не принимает слишком короткий текст", () => {
    const result = validateContactRequest({ topic: "problem", message: "не так" });
    expect(result.ok).toBe(false);
  });

  it("не принимает не-объект", () => {
    expect(validateContactRequest("привет").ok).toBe(false);
    expect(validateContactRequest(null).ok).toBe(false);
  });

  it("не принимает слишком длинное имя", () => {
    const result = validateContactRequest({
      topic: "other",
      name: "а".repeat(200),
      message: "Описываю свою проблему подробно.",
    });

    expect(result.ok).toBe(false);
  });
});
