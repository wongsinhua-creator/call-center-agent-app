export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 py-16 text-center">
      <p className="text-neutral-500 font-medium">{title}</p>
      {hint && <p className="text-neutral-400 text-sm mt-1">{hint}</p>}
    </div>
  );
}
