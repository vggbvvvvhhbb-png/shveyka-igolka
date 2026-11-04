/**
 * Кто владелец бота.
 *
 * Идентификатор чата хранится в файле: бот перезапускается вместе с
 * контейнером, и владелец не должен каждый раз писать /start заново.
 */

import fs from "node:fs";
import path from "node:path";

/** Хранилище идентификатора чата владельца. */
export class OwnerStore {
  private readonly file: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, "owner.json");
  }

  /** Идентификатор чата владельца; null, если он ещё не задан. */
  read(): number | null {
    try {
      const raw = fs.readFileSync(this.file, "utf8");
      const parsed = JSON.parse(raw) as { chatId?: unknown };
      const id = Number(parsed.chatId);
      return Number.isFinite(id) && id !== 0 ? id : null;
    } catch {
      // Файла ещё нет — значит, владелец не определён.
      return null;
    }
  }

  /** Запоминает чат владельца. */
  write(chatId: number): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify({ chatId }), "utf8");
  }
}
