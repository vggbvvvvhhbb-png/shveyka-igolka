import { describe, it, expect } from "vitest";
import { ConversationIdSchema, ConversationRoleSchema, AddMessageSchema } from "./conversations";

describe("ConversationIdSchema", () => {
  it("принимает обычный идентификатор", () => {
    expect(ConversationIdSchema.safeParse("3f1c0c2e-8a1b-4c2d-9e3f-112233445566").success).toBe(
      true
    );
  });

  it("отклоняет пустую строку", () => {
    expect(ConversationIdSchema.safeParse("").success).toBe(false);
  });

  it("отклоняет символы вне допустимого набора", () => {
    expect(ConversationIdSchema.safeParse("диалог/1").success).toBe(false);
    expect(ConversationIdSchema.safeParse("id with space").success).toBe(false);
  });
});

describe("ConversationRoleSchema", () => {
  it("принимает только user и assistant", () => {
    expect(ConversationRoleSchema.safeParse("user").success).toBe(true);
    expect(ConversationRoleSchema.safeParse("assistant").success).toBe(true);
    expect(ConversationRoleSchema.safeParse("system").success).toBe(false);
  });
});

describe("AddMessageSchema", () => {
  it("принимает обычное сообщение", () => {
    const result = AddMessageSchema.safeParse({ role: "user", content: "Привет" });

    expect(result.success).toBe(true);
  });

  it("отклоняет пустое сообщение", () => {
    expect(AddMessageSchema.safeParse({ role: "user", content: "   " }).success).toBe(false);
  });

  it("отклоняет слишком длинное сообщение", () => {
    expect(AddMessageSchema.safeParse({ role: "user", content: "я".repeat(4001) }).success).toBe(
      false
    );
  });
});
