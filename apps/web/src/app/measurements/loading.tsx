export default function MeasurementsLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-40 rounded-lg bg-stone-200 animate-pulse" />
        <div className="h-5 w-full max-w-xl rounded-lg bg-stone-200 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 rounded bg-stone-200 animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-stone-200 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 w-40 rounded-full bg-stone-200 animate-pulse" />
    </div>
  );
}
