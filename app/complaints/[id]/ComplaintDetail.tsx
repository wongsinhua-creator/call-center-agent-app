"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, PriorityBadge, CategoryChip, ConfidenceBadge } from "@/components/badges";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { AuditLog, Category, ComplaintHandler, ComplaintWithCategory, Status } from "@/lib/types";

const CHANNEL_LABELS: Record<string, string> = { phone: "Phone", chat: "Chat", email: "Email" };
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const AUDIT_LABELS: Record<string, string> = {
  created: "Complaint created",
  status_change: "Status changed",
  ai_tagged: "AI tagged",
  category_override: "Category changed",
  assigned: "Handling agent",
};

export function ComplaintDetail({
  complaint,
  auditLogs,
  categories,
  handlers,
}: {
  complaint: ComplaintWithCategory;
  auditLogs: AuditLog[];
  categories: Category[];
  handlers: ComplaintHandler[];
}) {
  const router = useRouter();

  const [status, setStatus] = useState<Status>(complaint.status);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState(complaint.category_id ?? "");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [notes, setNotes] = useState(complaint.resolution_notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [confirmingResolve, setConfirmingResolve] = useState(false);

  const [agentName, setAgentName] = useState(complaint.handled_by ?? "");
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    let res: Response;
    try {
      res = await fetch(`/api/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Never hang the UI: abort after the 10s response deadline.
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error("The request timed out after 10 seconds. Please try again.");
      }
      throw new Error("Network error — check your connection and try again.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Request failed");
    }
    return res.json();
  }

  async function saveStatus() {
    if (statusSaving || status === complaint.status) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      await patch({ status });
      router.refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function saveCategory() {
    if (categorySaving || categoryId === (complaint.category_id ?? "")) return;
    setCategorySaving(true);
    setCategoryError(null);
    try {
      await patch({ category_id: categoryId });
      router.refresh();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to update category.");
    } finally {
      setCategorySaving(false);
    }
  }

  async function saveNotes() {
    if (notesSaving) return;
    setNotesSaving(true);
    setNotesError(null);
    try {
      await patch({ resolution_notes: notes });
      router.refresh();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to save notes.");
    } finally {
      setNotesSaving(false);
    }
  }

  async function saveAgent() {
    if (agentSaving || agentName.trim() === (complaint.handled_by ?? "")) return;
    setAgentSaving(true);
    setAgentError(null);
    try {
      await patch({ handled_by: agentName });
      router.refresh();
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Failed to update handling agent.");
    } finally {
      setAgentSaving(false);
    }
  }

  async function markResolved() {
    setNotesSaving(true);
    setNotesError(null);
    try {
      await patch({ status: "resolved", resolution_notes: notes });
      setConfirmingResolve(false);
      setStatus("resolved");
      router.refresh();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to resolve complaint.");
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          <CategoryChip name={complaint.category?.name ?? complaint.category_ai} color={complaint.category?.color} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{complaint.caller_name}</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {CHANNEL_LABELS[complaint.channel] ?? complaint.channel}
          {complaint.caller_phone ? ` · ${complaint.caller_phone}` : ""} ·{" "}
          {formatDateTime(complaint.created_at)}
        </p>
        <p className="text-sm text-neutral-500 mt-0.5">
          Handling agent:{" "}
          <span className={complaint.handled_by ? "text-neutral-900 font-medium" : "text-neutral-400"}>
            {complaint.handled_by ?? "unassigned"}
          </span>
        </p>
      </div>

      <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Description</h2>
        <p className="text-neutral-900 whitespace-pre-wrap">{complaint.description}</p>
      </section>

      <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium text-neutral-500">AI Assessment</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-neutral-600">
            Urgency score:{" "}
            <strong className="text-neutral-900">
              {complaint.urgency_score !== null ? complaint.urgency_score.toFixed(1) : "—"}
            </strong>{" "}
            / 10
          </span>
          <ConfidenceBadge
            confidence={complaint.urgency_score_confidence}
            reviewStatus={complaint.urgency_score_review_status}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-neutral-600">
            AI suggested category: <strong className="text-neutral-900">{complaint.category_ai ?? "—"}</strong>
          </span>
          <ConfidenceBadge
            confidence={complaint.category_ai_confidence}
            reviewStatus={complaint.category_ai_review_status}
          />
        </div>
        {complaint.category_ai_source && (
          <p className="text-xs text-neutral-400">Source: {complaint.category_ai_source}</p>
        )}
      </section>

      <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Handling Agent</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent name (leave blank to unassign)"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <button
            onClick={saveAgent}
            disabled={agentSaving || agentName.trim() === (complaint.handled_by ?? "")}
            className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
          >
            {agentSaving ? "Saving…" : complaint.handled_by ? "Reassign" : "Assign"}
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          Every assignment is recorded in the audit log below.
        </p>
        {agentError && <p className="text-xs text-red-600">{agentError}</p>}

        {handlers.length > 0 && (
          <div className="pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-medium text-neutral-500 mb-2">
              Handling history — who handled which portion
            </h3>
            <ul className="space-y-1.5">
              {handlers.map((h) => {
                const end = h.ended_at ?? (complaint.status === "resolved" ? complaint.resolved_at : null);
                const durationMs = end ? new Date(end).getTime() - new Date(h.started_at).getTime() : null;
                return (
                  <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="font-medium text-neutral-800">{h.agent_name}</span>
                    <span className="text-xs text-neutral-500">
                      {formatDateTime(h.started_at)} → {h.ended_at ? formatDateTime(h.ended_at) : "current"}
                      <span className="text-neutral-400">
                        {" "}· {durationMs !== null ? formatDuration(Math.max(0, durationMs)) : "ongoing"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Status</h2>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={saveStatus}
            disabled={statusSaving || status === complaint.status}
            className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
          >
            {statusSaving ? "Saving…" : "Save Status"}
          </button>
        </div>
        {statusError && <p className="text-xs text-red-600">{statusError}</p>}
      </section>

      <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Category</h2>
        <div className="flex items-center gap-2">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={saveCategory}
            disabled={categorySaving || categoryId === (complaint.category_id ?? "")}
            className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
          >
            {categorySaving ? "Saving…" : "Save Category"}
          </button>
        </div>
        {categoryError && <p className="text-xs text-red-600">{categoryError}</p>}
      </section>

      <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Resolution Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="How was this resolved?"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        {complaint.resolved_at && (
          <p className="text-xs text-neutral-400">Resolved {formatDateTime(complaint.resolved_at)}</p>
        )}
        {notesError && <p className="text-xs text-red-600">{notesError}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={saveNotes}
            disabled={notesSaving}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40"
          >
            {notesSaving ? "Saving…" : "Save Notes"}
          </button>
          {complaint.status !== "resolved" && !confirmingResolve && (
            <button
              onClick={() => setConfirmingResolve(true)}
              className="rounded-md bg-emerald-700 text-white px-3 py-1.5 text-sm hover:bg-emerald-600"
            >
              Mark Resolved
            </button>
          )}
          {confirmingResolve && (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-neutral-600">Confirm resolve?</span>
              <button
                onClick={markResolved}
                disabled={notesSaving}
                className="rounded-md bg-emerald-700 text-white px-3 py-1.5 text-sm hover:bg-emerald-600 disabled:opacity-40"
              >
                {notesSaving ? "Resolving…" : "Yes, resolve"}
              </button>
              <button
                onClick={() => setConfirmingResolve(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </section>

      <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Audit Log</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-neutral-400">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {auditLogs.map((log) => (
              <li key={log.id} className="text-sm border-l-2 border-neutral-200 pl-3">
                <p className="text-neutral-800">
                  {AUDIT_LABELS[log.action] ?? log.action}
                  {log.old_value && log.new_value ? `: ${log.old_value} → ${log.new_value}` : ""}
                  {!log.old_value && log.new_value ? `: ${log.new_value}` : ""}
                  <span className="text-neutral-400"> · {log.actor_name ?? log.actor}</span>
                </p>
                <p className="text-xs text-neutral-400">{formatDateTime(log.created_at)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
