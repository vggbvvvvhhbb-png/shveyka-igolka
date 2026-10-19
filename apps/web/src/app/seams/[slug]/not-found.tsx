import Link from "next/link";

export default function SeamNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-stone-900">Шов не найден</h1>
      <p className="text-stone-600">Такого шва в каталоге нет. Возможно, ссылка устарела.</p>
      <Link
        href="/seams"
        className="inline-block rounded-xl border border-stone-300 px-4 py-2 text-base text-stone-700 transition-colors hover:bg-stone-100"
      >
        К каталогу швов
      </Link>
    </div>
  );
}
