export default function MeasurementsLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-40 rounded-plate bg-wash-2 animate-pulse" />
        <div className="h-5 w-full max-w-xl rounded-plate bg-wash-2 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 rounded bg-wash-2 animate-pulse" />
            <div className="h-10 w-full rounded-plate bg-wash-2 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 w-40 rounded-full bg-wash-2 animate-pulse" />
    </div>
  );
}
