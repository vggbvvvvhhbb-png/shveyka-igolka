"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ctxFromPath } from "@shveyka/core";

/**
 * Кнопка «Спросить Швейку про это».
 *
 * Ведёт на страницу помощника с готовым вопросом в адресной строке.
 * Строку вопроса проверяет и обрезает экран помощника.
 *
 * В ссылку добавляется страница, с которой ушли: помощник отвечает прежде
 * всего про неё.
 */
export function AskShveykaButton({
  question,
  label = "Спросить Швейку про это",
}: {
  question: string;
  label?: string;
}) {
  const pathname = usePathname();
  const ctx = ctxFromPath(pathname);

  const params = new URLSearchParams({ q: question });
  if (ctx) params.set("ctx", ctx);

  return (
    <Link
      href={`/assistant?${params.toString()}`}
      className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-base text-white transition-colors hover:bg-stone-700"
    >
      {label}
    </Link>
  );
}
