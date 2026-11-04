import { TelegramMark } from "@/components/TelegramMark";
import { TELEGRAM_BOT_URL } from "@/lib/site";

/**
 * Кнопка «Telegram-бот Швейка».
 *
 * Ведёт в бота @shveyka_igolka_bot: там тот же помощник и те же пять
 * калькуляторов, что на сайте. Открывается в новой вкладке, чтобы
 * читатель не потерял открытую страницу каталога.
 *
 * Варианты:
 * - `solid` — заливка, как у главных кнопок сайта;
 * - `quiet` — контур, для места, где кнопка не главная.
 */
export function TelegramBotButton({
  label = "Открыть бота",
  variant = "solid",
  className = "",
}: {
  label?: string;
  variant?: "solid" | "quiet";
  className?: string;
}) {
  const skin =
    variant === "solid"
      ? "bg-thread text-paper-hi hover:bg-thread-2"
      : "border border-hair-2 bg-paper-hi text-ink hover:bg-wash";

  return (
    <a
      href={TELEGRAM_BOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-plate px-4 py-2 text-base transition-colors ${skin} ${className}`}
    >
      <TelegramMark />
      {label}
    </a>
  );
}
