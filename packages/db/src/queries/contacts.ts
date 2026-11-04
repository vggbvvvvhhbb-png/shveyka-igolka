import { desc, eq } from "drizzle-orm";
import type { ContactRequestInput, ContactTopic } from "@shveyka/core";
import type { DatabaseClient } from "../client";
import { contactRequests } from "../schema";
import { withRetry } from "../utils/withRetry";

type ContactRow = typeof contactRequests.$inferSelect;

/** Обращение, сохранённое в базе. */
export interface ContactRequestRecord {
  id: string;
  topic: ContactTopic;
  name: string | null;
  contact: string | null;
  message: string;
  page: string | null;
  emailed: boolean;
  createdAt: Date;
}

function toRecord(row: ContactRow): ContactRequestRecord {
  return {
    id: row.id,
    topic: row.topic as ContactTopic,
    name: row.name,
    contact: row.contact,
    message: row.message,
    page: row.page,
    emailed: row.emailed,
    createdAt: row.created_at,
  };
}

/**
 * Сохраняет обращение.
 *
 * Письмо уходит отдельно: сначала пишем в базу, потом отправляем письмо и
 * отмечаем, что оно ушло. Так обращение не потеряется, если почта не
 * настроена или письмо не дошло.
 */
export async function saveContactRequest(
  db: DatabaseClient,
  input: ContactRequestInput
): Promise<ContactRequestRecord> {
  const rows = await withRetry(() =>
    db
      .insert(contactRequests)
      .values({
        id: crypto.randomUUID(),
        topic: input.topic,
        name: input.name ?? null,
        contact: input.contact ?? null,
        message: input.message,
        page: input.page ?? null,
        emailed: false,
      })
      .returning()
  );
  return toRecord(rows[0]);
}

/** Отмечает, что письмо по обращению отправлено. */
export async function markContactEmailed(db: DatabaseClient, id: string): Promise<void> {
  await withRetry(() =>
    db.update(contactRequests).set({ emailed: true }).where(eq(contactRequests.id, id))
  );
}

/** Обращения, свежие сверху. */
export async function listContactRequests(
  db: DatabaseClient,
  limit = 50
): Promise<ContactRequestRecord[]> {
  const rows = await withRetry(() =>
    db.select().from(contactRequests).orderBy(desc(contactRequests.created_at)).limit(limit)
  );
  return rows.map(toRecord);
}
