export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-neutral-200 rounded" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 rounded-lg bg-neutral-100 border border-neutral-200" />
      ))}
    </div>
  );
}
