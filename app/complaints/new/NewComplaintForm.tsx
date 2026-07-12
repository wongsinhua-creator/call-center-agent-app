"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";

const MIN_DESCRIPTION_LENGTH = 10;

export function NewComplaintForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [channel, setChannel] = useState("phone");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [handledBy, setHandledBy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!callerName.trim()) next.caller_name = "Caller name is required.";
    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      next.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller_name: callerName.trim(),
          caller_phone: callerPhone.trim() || null,
          channel,
          description: description.trim(),
          category_id: categoryId || null,
          handled_by: handledBy.trim() || null,
        }),
        // Never hang the UI: abort after the 10s response deadline.
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.fields) setErrors(data.fields);
        setSubmitError(data.error ?? "Failed to submit complaint.");
        setSubmitting(false);
        return;
      }

      const { id } = await res.json();
      router.push(`/complaints/${id}`);
    } catch (err) {
      const timedOut =
        err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
      setSubmitError(
        timedOut
          ? "The request timed out after 10 seconds. Please try again."
          : "Network error — please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-neutral-200 rounded-lg p-6">
      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
          {submitError}
        </div>
      )}

      <div>
        <label htmlFor="f-caller-name" className="block text-sm font-medium text-neutral-700 mb-1">Caller name *</label>
        <input
          id="f-caller-name"
          type="text"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.caller_name)}
          aria-describedby={errors.caller_name ? "f-caller-name-error" : undefined}
          value={callerName}
          onChange={(e) => setCallerName(e.target.value)}
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="Jane Doe"
        />
        {errors.caller_name && <p id="f-caller-name-error" role="alert" className="text-xs text-red-600 mt-1">{errors.caller_name}</p>}
      </div>

      <div>
        <label htmlFor="f-phone" className="block text-sm font-medium text-neutral-700 mb-1">Phone (optional)</label>
        <input
          id="f-phone"
          type="tel"
          value={callerPhone}
          onChange={(e) => setCallerPhone(e.target.value)}
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="555-0100"
        />
      </div>

      <div>
        <label htmlFor="f-agent-name" className="block text-sm font-medium text-neutral-700 mb-1">
          Your name <span className="text-neutral-400 font-normal">(the agent taking this call)</span>
        </label>
        <input
          id="f-agent-name"
          type="text"
          value={handledBy}
          onChange={(e) => setHandledBy(e.target.value)}
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="e.g. Sam Rivera"
        />
      </div>

      <div>
        <label htmlFor="f-channel" className="block text-sm font-medium text-neutral-700 mb-1">Channel *</label>
        <select
          id="f-channel"
          required
          aria-required="true"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="phone">Phone</option>
          <option value="chat">Chat</option>
          <option value="email">Email</option>
        </select>
      </div>

      <div>
        <label htmlFor="f-category" className="block text-sm font-medium text-neutral-700 mb-1">
          Category <span className="text-neutral-400 font-normal">(optional — AI will tag it automatically)</span>
        </label>
        <select
          id="f-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">Let AI decide</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-description" className="block text-sm font-medium text-neutral-700 mb-1">Description *</label>
        <textarea
          id="f-description"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "f-description-error" : undefined}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="What happened? Include as much detail as the caller gave you."
        />
        {errors.description && <p id="f-description-error" role="alert" className="text-xs text-red-600 mt-1">{errors.description}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-11 rounded-md bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Complaint"}
      </button>
    </form>
  );
}
