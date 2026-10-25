import { describe, expect, it } from "vitest";
import { checkLimit, MemoryRateStore } from "./rateLimitStore";

describe("память процесса", () => {
  it("окно, лимит и сброс", async () => {
    let t = 0;
    const store = new MemoryRateStore(() => t);

    const allowed: boolean[] = [];
    for (let i = 0; i < 4; i++) allowed.push((await checkLimit(store, "ip", 3, 60)).allowed);

    expect(allowed).toEqual([true, true, true, false]);
    expect((await checkLimit(store, "ip", 3, 60)).remaining).toBe(0);

    // Окно истекло — снова разрешено.
    t = 61_000;
    expect((await checkLimit(store, "ip", 3, 60)).allowed).toBe(true);
  });

  it("разные ключи не влияют друг на друга", async () => {
    const store = new MemoryRateStore();
    for (let i = 0; i < 3; i++) await checkLimit(store, "a", 3, 60);

    expect((await checkLimit(store, "a", 3, 60)).allowed).toBe(false);
    expect((await checkLimit(store, "b", 3, 60)).allowed).toBe(true);
  });

  it("счётчик растёт внутри окна", async () => {
    const store = new MemoryRateStore();
    expect(await store.hit("k", 60)).toBe(1);
    expect(await store.hit("k", 60)).toBe(2);
    expect(await store.hit("k", 60)).toBe(3);
  });
});

describe("сбой хранилища", () => {
  it("недоступный счётчик не блокирует запрос", async () => {
    const broken = {
      hit: async () => {
        throw new Error("down");
      },
    };

    let seen = false;
    const result = await checkLimit(broken, "k", 1, 60, () => {
      seen = true;
    });

    expect(result.allowed).toBe(true);
    expect(seen).toBe(true);
  });
});
