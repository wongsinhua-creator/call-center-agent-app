import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getComplaints } from "@/lib/data/complaints";
import { StatusBadge, PriorityBadge, CategoryChip, ConfidenceBadge } from "@/components/badges";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  phone: "Phone",
  chat: "Chat",
  email: "Email",
};

export default async function ComplaintListPage() {
  const supabase = await createClient();

  let complaints;
  try {
    complaints = await getComplaints(supabase);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
        <ErrorBanner message="Couldn't load complaints. Check the database connection and try again." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
        <Link
          href="/complaints/new"
          className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm hover:bg-neutral-700"
        >
          New Complaint
        </Link>
      </div>

      {complaints.length === 0 ? (
        <EmptyState title="No complaints yet" hint="Submit one from the New Complaint button above." />
      ) : (
        <ul className="space-y-3">
          {complaints.map((c) => (
            <li key={c.id}>
              <Link
                href={`/complaints/${c.id}`}
                className="block rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-400 transition-colors"
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
      )}
    </div>
  );
}
