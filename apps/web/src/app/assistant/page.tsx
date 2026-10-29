import Link from "next/link";
import { isUuid, isWorkMode, type Source } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { ChatWidget, type Message } from "@/components/ChatWidget";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Помощник Швейка",
  description: "Консультант по шитью: ткани, швы, проекты и настройки Brother LS-200s.",
};

/**
 * Страница помощника.
 *
 * ?q= или ?question= — готовый вопрос с другого экрана (например, из
 * калькулятора или кнопки «Спросить Швейку про это»): помощник отправляет его
 * сам. ?c= — id сохранённого диалога: страница открывает его с перепиской.
 *
 * ?ctx= — страница каталога, с которой пришёл вопрос (`fabric/<slug>`):
 * её запись попадает в контекст ответа первой.
 */
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; question?: string; c?: string; ctx?: string }>;
}) {
  const { q, question, c, ctx } = await searchParams;

  let conversationId: string | undefined;
  let initialMessages: Message[] | undefined;

  if (isUuid(c)) {
    const db = getDbSingleton();
    if (await queries.getConversation(db, c)) {
      const rows = await queries.listMessages(db, c);
      conversationId = c;
      initialMessages = rows.map((row) => ({
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
        // id ответа нужен, чтобы его можно было оценить, а slug — чтобы ссылки
        // на каталог снова стали кликабельными.
        id: row.role === "assistant" ? row.id : undefined,
        slugs: row.role === "assistant" ? row.context_slugs : undefined,
        // Режим работы и источники сохранялись вместе с ответом: в открытом
        // заново диалоге они остаются видны, как были при получении.
        workMode: row.role === "assistant" && isWorkMode(row.mode) ? row.mode : undefined,
        sources: row.role === "assistant" ? (row.sources as Source[]) : undefined,
      }));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-stone-900">Помощник Швейка</h1>
          <p className="text-stone-600">
            Отвечает по каталогу Швейки: ткани, швы, проекты и настройки машины.
          </p>
        </div>
        <div className="flex gap-4 text-sm text-stone-600">
          {conversationId && (
            <Link href="/assistant" className="underline underline-offset-2 hover:text-stone-900">
              Новый диалог
            </Link>
          )}
          <Link
            href="/assistant/history"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            История диалогов
          </Link>
        </div>
      </div>

      <ChatWidget
        key={conversationId ?? "new"}
        conversationId={conversationId}
        initialMessages={initialMessages}
        initialMessage={conversationId ? undefined : (q ?? question)}
        ctx={ctx}
      />
    </div>
  );
}
