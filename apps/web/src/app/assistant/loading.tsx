import { CardSkeleton } from "@/components/CardSkeleton";

export default function AssistantLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6 max-w-3xl mx-auto">
      <span className="sr-only">Загрузка помощника…</span>

      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-stone-200 animate-pulse" />
        <div className="h-4 w-80 rounded bg-stone-100 animate-pulse" />
      </div>

      <div className="space-y-4">
        <CardSkeleton variant="seam" />
        <CardSkeleton variant="seam" />
      </div>

      <div className="h-12 w-full rounded-xl bg-stone-200 animate-pulse" />
    </div>
  );
}
