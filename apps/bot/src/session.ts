import type { Context, SessionFlavor } from "grammy";
import type { HardwareInput } from "@shveyka/core/calculator/hardware";
import type { ProjectEntry } from "@shveyka/core/calculator/profit";

/** Ответы, собранные диалогом: ключ шага → значение. */
export type Data = Record<string, unknown>;

/** Состояние текущего пошагового диалога. */
export interface WizardState {
  /** Какой сценарий идёт: "cut", "profit"… */
  id: string;
  /** Номер текущего вопроса. */
  step: number;
  /** Собранные ответы. */
  data: Data;
  /** Отметки в вопросе с множественным выбором. */
  multi: string[];
  /** Сообщение с текущим вопросом — его кнопки убираем после ответа. */
  msgId?: number;
}

export interface SessionData {
  wiz?: WizardState;
  /** История для «Итогов месяца». */
  projects: ProjectEntry[];
  /** Последний расчёт фурнитуры — чтобы отмечать, что уже есть дома. */
  hw?: { input: HardwareInput; have: string[] };
  /** Текст для QR-кода последней инструкции по уходу. */
  careQr?: string;
}

export type MyContext = Context & SessionFlavor<SessionData>;

export const initialSession = (): SessionData => ({ projects: [] });
