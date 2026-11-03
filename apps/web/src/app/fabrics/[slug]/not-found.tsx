import Link from "next/link";

export default function FabricNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">Ткань не найдена</h1>
      <p className="text-ink-2">Такой ткани в каталоге нет. Возможно, ссылка устарела.</p>
      <Link
        href="/fabrics"
        className="inline-block rounded-plate border border-hair-2 px-4 py-2 text-base text-ink-2 transition-colors hover:bg-wash"
      >
        К каталогу тканей
      </Link>
    </div>
  );
}
