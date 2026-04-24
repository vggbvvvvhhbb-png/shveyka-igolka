import { describe, it, expect } from "vitest";
import { withRetry, WithRetryOptions } from "./withRetry";

class MockError extends Error {
  code: string;
  constructor(code: string, message = "mock") {
    super(message);
    this.code = code;
  }
}

describe("withRetry", () => {
  it("returns immediately on success", async () => {
    const fn = () => Promise.resolve(42);
    const result = await withRetry(fn);
    expect(result).toBe(42);
  });

  it("retries on ENOBUFS and eventually succeeds", async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 3) {
        return Promise.reject(new MockError("ENOBUFS"));
      }
      return Promise.resolve("ok");
    };
    const result = await withRetry(fn, { delayMs: 10 });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("retries on ECONNRESET and eventually succeeds", async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls === 1) {
        return Promise.reject(new MockError("ECONNRESET"));
      }
      return Promise.resolve("recovered");
    };
    const result = await withRetry(fn, { delayMs: 10 });
    expect(result).toBe("recovered");
    expect(calls).toBe(2);
  });

  it("throws after exhausting retries", async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      return Promise.reject(new MockError("ENOBUFS"));
    };
    await expect(withRetry(fn, { retries: 1, delayMs: 10 })).rejects.toThrow("mock");
    expect(calls).toBe(2); // initial + 1 retry
  });

  it("does not retry non-retryable errors", async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      return Promise.reject(new Error("syntax error"));
    };
    await expect(withRetry(fn, { retries: 2, delayMs: 10 })).rejects.toThrow("syntax error");
    expect(calls).toBe(1);
  });

  it("allows custom shouldRetry predicate", async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      return Promise.reject(new Error("custom"));
    };
    const options: WithRetryOptions = {
      retries: 1,
      delayMs: 10,
      shouldRetry: (err) => err instanceof Error && err.message.includes("custom"),
    };
    await expect(withRetry(fn, options)).rejects.toThrow("custom");
    expect(calls).toBe(2);
  });
});
