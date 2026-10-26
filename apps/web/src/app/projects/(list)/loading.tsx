import { CardSkeleton } from "@/components/CardSkeleton";

export default function ProjectsLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Загрузка каталога проектов…</span>

      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-stone-200 animate-pulse" />
        <div className="h-4 w-32 rounded bg-stone-100 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, index) => (
          <CardSkeleton key={index} variant="project" />
        ))}
      </div>
    </div>
  );
}
