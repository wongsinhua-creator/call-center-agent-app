export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-neutral-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-neutral-100 border border-neutral-200" />
        ))}
      </div>
      <div className="h-40 rounded-lg bg-neutral-100 border border-neutral-200" />
      <div className="h-40 rounded-lg bg-neutral-100 border border-neutral-200" />
    </div>
  );
}
