"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, PriorityBadge, CategoryChip, ConfidenceBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { ComplaintWithCategory } from "@/lib/types";

const CHANNEL_LABELS: Record<string, string> = { phone: "Phone", chat: "Chat", email: "Email" };
const MAX_BULK = 25;

// Queue power tools (assessment 31–60 day track): multi-select rows and
// bulk-assign a handling agent. "/" focuses the search box.
export function QueueList({ complaints }: { complaints: ComplaintWithCategory[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [agent, setAgent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const agentInputRef = useRef<HTMLInputElement>(null);

  // Keyboard accelerator: "/" jumps to search unless already typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const search = document.getElementById("queue-q") as HTMLInputElement | null;
      if (search) {
        e.preventDefault();
        search.focus();
        search.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked && next.size < MAX_BULK) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkAssign(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!agent.trim()) {
      setError("Enter the agent name to assign.");
      agentInputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/complaints/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], handled_by: agent.trim() }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Bulk assignment failed");
      setNotice(
        `Assigned ${data.updated} complaint${data.updated === 1 ? "" : "s"} to ${agent.trim()}` +
          (data.failed ? ` (${data.failed} failed)` : "") +
          ".",
      );
      setSelected(new Set());
      setAgent("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")
          ? "The request timed out after 10 seconds. Please try again."
          : err instanceof Error
            ? err.message
            : "Bulk assignment failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {notice && (
        <div role="status" className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <form
          onSubmit={bulkAssign}
          className="sticky top-0 z-10 bg-neutral-900 text-white rounded-lg px-4 py-3 flex flex-wrap items-center gap-3"
        >
          <span className="text-sm font-medium">
            {selected.size} selected{selected.size >= MAX_BULK ? " (max)" : ""}
          </span>
          <label htmlFor="bulk-agent" className="sr-only">
            Agent name to assign the selected complaints to
          </label>
          <input
            id="bulk-agent"
            ref={agentInputRef}
            type="text"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="Assign to agent…"
            className="flex-1 min-w-40 min-h-11 rounded-md border-0 px-3 py-2 text-sm text-neutral-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-md bg-white text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? "Assigning…" : "Assign Selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="min-h-11 rounded-md border border-neutral-600 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Clear
          </button>
        </form>
      )}

      <ul className="space-y-3">
        {complaints.map((c) => (
          <li key={c.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={(e) => toggle(c.id, e.target.checked)}
              aria-label={`Select complaint from ${c.caller_name}`}
              className="mt-5 h-5 w-5 shrink-0 rounded border-neutral-300 accent-neutral-900"
            />
            <Link
              href={`/complaints/${c.id}`}
              className="flex-1 block rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-400 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <StatusBadge status={c.status} />
                <PriorityBadge priority={c.priority} />
                <CategoryChip name={c.category?.name ?? c.category_ai} color={c.category?.color} />
                <ConfidenceBadge
                  confidence={c.category_ai_confidence}
                  reviewStatus={c.category_ai_review_status}
                />
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-medium text-neutral-900">{c.caller_name}</p>
                <p className="text-xs text-neutral-400 whitespace-nowrap">
                  {formatDateTime(c.created_at)}
                </p>
              </div>
              <p className="text-sm text-neutral-500 mt-0.5 line-clamp-1">
                {CHANNEL_LABELS[c.channel] ?? c.channel} · {c.description}
              </p>
              <p className="text-xs mt-1">
                {c.handled_by ? (
                  <span className="text-neutral-600">
                    Handling: <span className="font-medium text-neutral-800">{c.handled_by}</span>
                  </span>
                ) : (
                  <span className="text-neutral-400">Unassigned</span>
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-neutral-400">
        Tip: press <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1">/</kbd> to
        search · select rows to bulk-assign an agent
      </p>
    </div>
  );
}
