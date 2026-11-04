"use client";

/**
 * Переключатель «Ночная/Дневная таблица».
 *
 * Выбор помнится в localStorage и сразу ставится на <html>. До отрисовки
 * страницы тему выставляет отдельный скрипт в корневом layout — поэтому
 * светлой вспышки не бывает.
 *
 * Подпись показывает следующий режим и меняется после монтирования: первый
 * рендер совпадает с серверной разметкой, поэтому гидратация не ругается.
 * Состояние дублируется aria-pressed для скринридеров.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "shveyka-theme";

export function ThemeToggle() {
  // На сервере и при первом клиентском рендере считаем тему дневной;
  // фактическое состояние читаем после монтирования.
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    setIsNight(document.documentElement.getAttribute("data-theme") === "night");
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "night" ? "day" : "night";
    root.setAttribute("data-theme", next);
    setIsNight(next === "night");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Приватный режим: выбор просто не запомнится, это не страшно.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isNight}
      aria-label={isNight ? "Дневная таблица" : "Ночная таблица"}
      className="theme-toggle inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-green"
    >
      <span className="theme-toggle-dot" aria-hidden="true" />
      {isNight ? "Дневная таблица" : "Ночная таблица"}
    </button>
  );
}
