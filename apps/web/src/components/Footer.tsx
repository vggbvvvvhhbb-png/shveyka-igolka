import Link from "next/link";
import { TelegramBotButton } from "@/components/TelegramBotButton";
import { TelegramMark } from "@/components/TelegramMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { btnGhostCls } from "@/components/ui";
import { OWNER_TELEGRAM_URL } from "@/lib/site";

/**
 * Подвал «Выходные данные».
 *
 * Тонкие колонки с разделами справочника и едва заметный контур иглы с
 * ниткой на фоне — как на полях старой книги.
 */

const columns = [
  {
    title: "Справочник",
    links: [
      { href: "/fabrics", label: "Ткани" },
      { href: "/seams", label: "Швы" },
      { href: "/projects", label: "Проекты" },
    ],
  },
  {
    title: "Расчёты",
    links: [
      { href: "/calculator", label: "Раскрой" },
      { href: "/profit", label: "Выгода" },
      { href: "/analog", label: "Аналог ткани" },
      { href: "/hardware", label: "Фурнитура" },
      { href: "/care", label: "Уход" },
    ],
  },
  {
    title: "Помощь",
    links: [
      { href: "/start", label: "С чего начать" },
      { href: "/measurements", label: "Мерки" },
      { href: "/assistant", label: "Помощник Швейка" },
    ],
  },
];

/** Контур иглы с ниткой — фоном подвала. */
function NeedleContour() {
  return (
    <svg
      viewBox="0 0 200 120"
      className="pointer-events-none absolute -right-6 bottom-0 h-28 w-48 text-ink opacity-[0.08]"
      aria-hidden="true"
      fill="none"
    >
      <path d="M14 106 150 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M150 16 168 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M144 22c26 8 36 28 28 48-7 18-30 26-46 18-12-6-16-18-12-28"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M14 106 2 114" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-hair bg-wash">
      <NeedleContour />
      <div className="relative mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="plate-label mb-3">{column.title}</h2>
              <ul className="space-y-1.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-2 transition-colors hover:text-green"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-hair pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-green">
              <TelegramMark className="h-6 w-6" />
            </span>
            <div>
              <p className="font-title text-lg font-bold text-ink">Швейка в Telegram</p>
              <p className="text-sm text-ink-2">
                Тот же помощник и пять калькуляторов — прямо в чате.
              </p>
            </div>
          </div>
          <TelegramBotButton label="Открыть бота" />
        </div>

        {/* Обращения и правила: то, что человек ищет в подвале в последнюю очередь. */}
        <div className="mt-6 flex flex-col gap-3 border-t border-hair pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Написать владельцу или прочитать правила</p>
            <p className="text-xs text-ink-3">
              Обращения приходят письмом на почту сайта, а в Telegram можно написать напрямую. В
              правилах — лимиты помощника и то, что он умеет.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contacts" className={btnGhostCls}>
              Контакты для обращения
            </Link>
            <a
              href={OWNER_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={btnGhostCls}
            >
              <TelegramMark className="h-5 w-5" />
              Написать в Telegram
            </a>
            <Link href="/rules" className={btnGhostCls}>
              Правила сайта и помощника
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-hair pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-latin text-sm italic text-ink-3">
            Швейка · Атлас домашнего шитья · MMXXVI
          </p>
          <div className="flex items-center gap-5">
            {/* Заставка сама приходит раз за сессию; ссылка возвращает её. */}
            <Link
              href="/?intro=1"
              className="text-sm text-ink-2 transition-colors hover:text-green"
            >
              Показать заставку снова
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
