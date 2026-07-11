export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-neutral-200 rounded" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-lg bg-neutral-100 border border-neutral-200" />
      ))}
    </div>
  );
}
