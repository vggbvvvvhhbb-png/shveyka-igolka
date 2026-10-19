import Link from "next/link";

/**
 * Кнопка «Спросить Швейку про это».
 *
 * Ведёт на страницу помощника с готовым вопросом в адресной строке.
 * Строку вопроса проверяет и обрезает экран помощника.
 */
export function AskShveykaButton({
  question,
  label = "Спросить Швейку про это",
}: {
  question: string;
  label?: string;
}) {
  const params = new URLSearchParams({ question });

  return (
    <Link
      href={`/assistant?${params.toString()}`}
      className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-base text-white transition-colors hover:bg-stone-700"
    >
      {label}
    </Link>
  );
}
