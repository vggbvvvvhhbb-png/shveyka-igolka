/**
 * Знак Telegram: бумажный самолётик тонкой линией.
 *
 * Нарисован так же, как остальные знаки сайта — линией, без заливки,
 * чтобы рядом с иглой и стрелкой выглядел частью того же определителя.
 */
export function TelegramMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M20.5 4.5 3.8 10.9c-.6.2-.6 1.1 0 1.3l4.4 1.4 1.7 5.2c.2.6 1 .8 1.4.3l2.5-2.9 4.4 3.3c.5.4 1.3.1 1.4-.6l2.6-13.6c.1-.6-.5-1-1.1-.8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="m8.2 13.6 8.9-6.6-6.3 7.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
