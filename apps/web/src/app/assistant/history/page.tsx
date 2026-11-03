import Link from "next/link";
import { getDbSingleton, queries } from "@shveyka/db";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "История диалогов — Швейка",
  description: "Прошлые разговоры с помощником.",
};

const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });

/** Список сохранённых диалогов с помощником: открыть, продолжить или удалить. */
export default async function HistoryPage() {
  const conversations = await queries.listConversations(getDbSingleton());

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-bold text-ink">История диалогов</h1>
        <Link
          href="/assistant"
          className="rounded-plate bg-thread px-4 py-2 text-base text-paper-hi hover:bg-thread-2"
        >
          Новый диалог
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="text-ink-2">
          Пока пусто. Вопросы, которые вы зададите помощнику, появятся здесь.
        </p>
      ) : (
        <ul className="divide-y divide-hair rounded-plate border border-hair bg-paper-hi">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <Link href={`/assistant?c=${conversation.id}`} className="min-w-0 flex-1 space-y-0.5">
                <span className="block truncate text-ink hover:text-ink-2">
                  {conversation.title ?? "Без названия"}
                </span>
                <span className="block text-sm text-ink-3">
                  {dateFormat.format(conversation.updated_at)}
                </span>
              </Link>
              <DeleteButton endpoint={`/api/conversations/${conversation.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
