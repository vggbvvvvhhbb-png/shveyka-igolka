/**
 * План перезаливки таблицы каталога: что удалить, чтобы содержимое БД
 * совпало с сидами.
 *
 * План считается чистой функцией — без БД, поэтому его легко покрыть тестом
 * и переиспользовать в других местах.
 */
export interface SyncPlan {
  /** Записи, которых больше нет в сидах — их нужно удалить. */
  toDelete: string[];
  /** Записи, которые есть и в БД, и в сидах — их не трогаем. */
  toKeep: string[];
}

/**
 * Пустой набор сидов считается ошибкой, а не командой «удалить всё»:
 * так битый или не найденный JSON не обнулит каталог.
 *
 * Повторяющиеся id в сидах — тоже ошибка: иначе одна запись молча перезапишет
 * другую, и в каталоге окажется не то, что задумано.
 */
export function planSync(existingIds: readonly string[], incomingIds: readonly string[]): SyncPlan {
  if (incomingIds.length === 0) {
    throw new Error("Сиды пусты: перезаливка отменена, чтобы не очистить таблицу.");
  }

  const incoming = new Set(incomingIds);
  if (incoming.size !== incomingIds.length) {
    throw new Error("В сидах есть повторяющиеся id.");
  }

  const existing = new Set(existingIds);
  return {
    toDelete: [...existing].filter((id) => !incoming.has(id)),
    toKeep: [...existing].filter((id) => incoming.has(id)),
  };
}
