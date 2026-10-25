import { ChatWidget } from "@/components/ChatWidget";

export const metadata = {
  title: "Помощник Швейка",
  description: "Консультант по шитью: ткани, швы, проекты и настройки Brother LS-200s.",
};

/**
 * Страница помощника.
 *
 * Параметр ?q= — это готовый вопрос с другого экрана (например, из
 * калькулятора): помощник отправляет его сам, маме остаётся только прочитать
 * ответ.
 *
 * Параметр ?ctx= — страница каталога, с которой пришёл вопрос
 * (`fabric/<slug>`): её запись попадает в контекст ответа первой.
 */
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ctx?: string }>;
}) {
  const { q, ctx } = await searchParams;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Помощник Швейка</h1>
        <p className="text-stone-600">
          Отвечает по каталогу Швейки: ткани, швы, проекты и настройки машины.
        </p>
      </div>

      <ChatWidget initialMessage={q} ctx={ctx} />
    </div>
  );
}
