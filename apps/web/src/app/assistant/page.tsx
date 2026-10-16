import { ChatWidget } from "@/components/ChatWidget";

export const metadata = {
  title: "Помощник Швейка",
  description: "Консультант по шитью: ткани, швы, проекты и настройки Brother LS-200s.",
};

export default function AssistantPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Помощник Швейка</h1>
        <p className="text-stone-600">
          Отвечает по каталогу Швейки: ткани, швы, проекты и настройки машины.
        </p>
      </div>

      <ChatWidget />
    </div>
  );
}
