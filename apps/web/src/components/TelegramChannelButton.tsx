import { TELEGRAM_CHANNEL_URL } from "@/lib/site";

/**
 * Знак канала: рупор тонкой линией.
 *
 * Нарисован так же, как знак Telegram, — линией, без заливки, чтобы рядом с
 * иглой и стрелкой выглядел частью того же определителя. От знака Telegram
 * отличается формой: бота зовут в чат, канал читают.
 */
export function ChannelMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M4 10.5v3a1.5 1.5 0 0 0 1.5 1.5H7l2 4h2l-1.4-4H11l7 3.5v-9L11 8.5H5.5A1.5 1.5 0 0 0 4 10.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M18.6 9.4a4.6 4.6 0 0 1 0 5.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Кнопка «Канал мастерской».
 *
 * Ведёт в канал @shveyka_igolka: там заметки о шитье, анонсы и разборы.
 * Открывается в новой вкладке, чтобы читатель не потерял открытую страницу.
 *
 * Варианты:
 * - `solid` — заливка, как у главных кнопок сайта;
 * - `quiet` — контур, для места, где кнопка не главная.
 */
export function TelegramChannelButton({
  label = "Открыть канал",
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
      href={TELEGRAM_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-plate px-4 py-2 text-base transition-colors ${skin} ${className}`}
    >
      <ChannelMark />
      {label}
    </a>
  );
}
