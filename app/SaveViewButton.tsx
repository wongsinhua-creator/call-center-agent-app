"use client";

import { useState } from "react";

// Saves the current queue filter combination (URL params) as a named view on
// the agent's personal dashboard.
export function SaveViewButton({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save view");
      setIsError(false);
      setMessage(`Saved "${data.filter.name}" to your dashboard.`);
      setOpen(false);
      setName("");
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Failed to save view");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
          className="min-h-11 rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Save view
        </button>
      ) : (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <label htmlFor="save-view-name" className="sr-only">
            Name for this saved view
          </label>
          <input
            id="save-view-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My open queue"
            maxLength={60}
            required
            className="min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-md bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Cancel
          </button>
        </form>
      )}
      {message && (
        <p role={isError ? "alert" : "status"} className={`text-xs ${isError ? "text-red-600" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
