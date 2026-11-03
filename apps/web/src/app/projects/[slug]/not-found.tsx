import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">Проект не найден</h1>
      <p className="text-ink-2">Такого проекта в каталоге нет. Возможно, ссылка устарела.</p>
      <Link
        href="/projects"
        className="inline-block rounded-plate border border-hair-2 px-4 py-2 text-base text-ink-2 transition-colors hover:bg-wash"
      >
        К каталогу проектов
      </Link>
    </div>
  );
}
