"use client";

import { useEffect, useState } from "react";

/**
 * Состояние, которое само сохраняется в localStorage.
 *
 * loaded становится true после чтения хранилища. Пока он false, значение
 * ещё не то, что лежит у пользователя, — проверяй его, если разница видна.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* битые данные — игнорируем */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* хранилище переполнено или недоступно */
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
