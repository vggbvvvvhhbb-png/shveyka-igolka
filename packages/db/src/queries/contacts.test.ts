import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { DatabaseClient } from "../client";
import * as schema from "../schema";
import { listContactRequests, markContactEmailed, saveContactRequest } from "./contacts";

describe("обращения через форму в pglite", () => {
  let db: DatabaseClient;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as DatabaseClient;
    await client.exec(`
      CREATE TABLE contact_requests (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        name TEXT,
        contact TEXT,
        message TEXT NOT NULL,
        page TEXT,
        emailed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });

  it("сохраняет обращение с темой и текстом", async () => {
    const record = await saveContactRequest(db, {
      topic: "suggestion",
      name: "Аня",
      contact: "anya@example.com",
      message: "Добавьте, пожалуйста, трикотаж в каталог.",
      page: "/fabrics",
    });

    expect(record.id.length).toBeGreaterThan(0);
    expect(record.topic).toBe("suggestion");
    expect(record.name).toBe("Аня");
    expect(record.emailed).toBe(false);
  });

  it("оставляет необязательные поля пустыми, если их не заполнили", async () => {
    const record = await saveContactRequest(db, {
      topic: "question",
      message: "Как ухаживать за льном после стирки?",
    });

    expect(record.name).toBeNull();
    expect(record.contact).toBeNull();
    expect(record.page).toBeNull();
  });

  it("отмечает, что письмо отправлено", async () => {
    const record = await saveContactRequest(db, {
      topic: "bug",
      message: "Кнопка не работает на странице каталога.",
    });

    await markContactEmailed(db, record.id);
    const list = await listContactRequests(db);

    expect(list.find((r) => r.id === record.id)?.emailed).toBe(true);
  });

  it("отдаёт обращения свежими сверху", async () => {
    const first = await saveContactRequest(db, {
      topic: "other",
      message: "Первое обращение по порядку.",
    });
    const second = await saveContactRequest(db, {
      topic: "other",
      message: "Второе обращение по порядку.",
    });

    const list = await listContactRequests(db);
    const firstIndex = list.findIndex((r) => r.id === first.id);
    const secondIndex = list.findIndex((r) => r.id === second.id);

    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeLessThan(firstIndex);
  });
});
