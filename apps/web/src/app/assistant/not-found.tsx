import Link from "next/link";

export default function AssistantNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-stone-900">Страница не найдена</h1>
      <p className="text-stone-600">Такой страницы в разделе помощника нет.</p>
      <Link
        href="/"
        className="inline-block rounded-xl border border-stone-300 px-4 py-2 text-base text-stone-700 transition-colors hover:bg-stone-100"
      >
        На главную
      </Link>
    </div>
  );
}
