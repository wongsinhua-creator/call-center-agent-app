"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SavedFilter {
  id: string;
  name: string;
  query: string;
}

function describe(query: string): string {
  const p = new URLSearchParams(query);
  const parts: string[] = [];
  if (p.get("q")) parts.push(`search "${p.get("q")}"`);
  if (p.get("status")) parts.push(`status ${p.get("status")!.replace("_", " ")}`);
  if (p.get("agent")) parts.push(`agent ${p.get("agent")}`);
  if (p.get("sort")) parts.push(`sorted by ${p.get("sort")}`);
  return parts.length ? parts.join(" · ") : "all complaints";
}

// The agent's personal saved views: apply as a link, or remove.
export function SavedViews({ filters }: { filters: SavedFilter[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/saved-filters/${id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove view");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove view");
    } finally {
      setBusy(null);
    }
  }

  if (filters.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        No saved views yet — set filters on the Complaints queue and press &ldquo;Save view&rdquo;.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <ul className="space-y-1.5">
        {filters.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
            <Link
              href={f.query ? `/?${f.query}` : "/"}
              className="min-h-11 flex-1 flex flex-col justify-center rounded-md px-3 py-1.5 hover:bg-neutral-50"
            >
              <span className="font-medium text-neutral-900">{f.name}</span>
              <span className="text-xs text-neutral-500">{describe(f.query)}</span>
            </Link>
            <button
              onClick={() => remove(f.id)}
              disabled={busy === f.id}
              aria-label={`Remove saved view ${f.name}`}
              className="min-h-11 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            >
              {busy === f.id ? "Removing…" : "Remove"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
