"use client";

/**
 * Переключатель «Ночная таблица».
 *
 * Выбор помнится в localStorage и сразу ставится на <html>. До отрисовки
 * страницы тему выставляет отдельный скрипт в корневом layout — поэтому
 * светлой вспышки не бывает.
 *
 * Подпись кнопки не меняется: состояние показывает точка рядом с ней,
 * а она красится стилями по атрибуту data-theme на <html>. Так на сервере
 * и в браузере разметка совпадает, и гидратация не ругается.
 */

const STORAGE_KEY = "shveyka-theme";

export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "night" ? "day" : "night";
    root.setAttribute("data-theme", next);
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
      aria-label="Ночная таблица"
      className="theme-toggle inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-green"
    >
      <span className="theme-toggle-dot" aria-hidden="true" />
      Ночная таблица
    </button>
  );
}
