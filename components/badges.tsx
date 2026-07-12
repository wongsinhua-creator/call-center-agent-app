import type { Priority, ReviewStatus, Status } from "@/lib/types";

const STATUS_STYLES: Record<Status, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-neutral-100 text-neutral-600",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

export function CategoryChip({ name, color }: { name: string | null; color?: string | null }) {
  if (!name) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-500">
        Uncategorized
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color ?? "#9ca3af"}22`, color: color ?? "#6b7280" }}
    >
      {name}
    </span>
  );
}

const REVIEW_STYLES: Record<ReviewStatus, string> = {
  unreviewed: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
  confirmed: "bg-neutral-50 text-neutral-600 ring-1 ring-inset ring-neutral-200",
  overridden: "bg-neutral-50 text-neutral-600 ring-1 ring-inset ring-neutral-200",
};

const REVIEW_EXPLAIN: Record<ReviewStatus, string> = {
  unreviewed: "no agent has reviewed the suggestion yet",
  confirmed: "an agent confirmed the suggestion",
  overridden: "an agent overrode the suggestion",
};

export function ConfidenceBadge({
  confidence,
  reviewStatus,
}: {
  confidence: number | null;
  reviewStatus: ReviewStatus;
}) {
  if (confidence === null) {
    return (
      <span
        title="The AI classifier did not produce a suggestion for this complaint."
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-neutral-50 text-neutral-400 ring-1 ring-inset ring-neutral-200"
      >
        AI: unavailable
      </span>
    );
  }
  const pct = Math.round(confidence * 100);
  const explain = `AI suggested the category with ${pct}% confidence; ${REVIEW_EXPLAIN[reviewStatus]}. Agents can override it on the complaint page.`;
  return (
    <span
      title={explain}
      aria-label={explain}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STYLES[reviewStatus]}`}
    >
      AI {pct}% · {reviewStatus}
    </span>
  );
}
