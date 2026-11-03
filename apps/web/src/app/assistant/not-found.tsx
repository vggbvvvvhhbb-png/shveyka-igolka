import Link from "next/link";

export default function AssistantNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">Страница не найдена</h1>
      <p className="text-ink-2">Такой страницы в разделе помощника нет.</p>
      <Link
        href="/"
        className="inline-block rounded-plate border border-hair-2 px-4 py-2 text-base text-ink-2 transition-colors hover:bg-wash"
      >
        На главную
      </Link>
    </div>
  );
}
