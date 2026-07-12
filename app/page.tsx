import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgentNames, getComplaintQueue, type QueueQuery } from "@/lib/data/complaints";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { QueueList } from "./QueueList";
import { SaveViewButton } from "./SaveViewButton";

export const dynamic = "force-dynamic";

const STATUSES = ["open", "in_progress", "resolved"] as const;
const SORTS = ["urgency", "newest", "oldest"] as const;

function parseQuery(params: Record<string, string | string[] | undefined>): QueueQuery {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : undefined;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as QueueQuery["status"])
    : undefined;
  const sort = SORTS.includes(params.sort as (typeof SORTS)[number])
    ? (params.sort as QueueQuery["sort"])
    : "urgency";
  const agent = typeof params.agent === "string" ? params.agent.trim().slice(0, 100) : undefined;
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  return { q: q || undefined, status, agent: agent || undefined, sort, page };
}

function pageHref(query: QueueQuery, page: number): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.status) p.set("status", query.status);
  if (query.agent) p.set("agent", query.agent);
  if (query.sort && query.sort !== "urgency") p.set("sort", query.sort);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export default async function ComplaintListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseQuery(await searchParams);
  const supabase = await createClient();

  let result;
  let agentNames: string[] = [];
  try {
    [result, agentNames] = await Promise.all([
      getComplaintQueue(supabase, query),
      getAgentNames(supabase),
    ]);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
        <ErrorBanner message="Couldn't load complaints. Check the database connection and try again." />
      </div>
    );
  }

  const filtered = Boolean(query.q || query.status || query.agent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
        <Link
          href="/complaints/new"
          className="rounded-md bg-neutral-900 text-white px-3 py-2 text-sm hover:bg-neutral-700"
        >
          New Complaint
        </Link>
      </div>

      {/* Queue toolbar: plain GET form — URL-driven, so views are shareable */}
      <form
        method="get"
        action="/"
        role="search"
        aria-label="Search and filter complaints"
        className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-40">
          <label htmlFor="queue-q" className="block text-xs font-medium text-neutral-600 mb-1">
            Search caller or description
          </label>
          <input
            id="queue-q"
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="e.g. refund, Trevor…"
            className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="queue-status" className="block text-xs font-medium text-neutral-600 mb-1">
            Status
          </label>
          <select
            id="queue-status"
            name="status"
            defaultValue={query.status ?? ""}
            className="min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label htmlFor="queue-agent" className="block text-xs font-medium text-neutral-600 mb-1">
            Call agent
          </label>
          <select
            id="queue-agent"
            name="agent"
            defaultValue={query.agent ?? ""}
            className="min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All agents</option>
            <option value="unassigned">Unassigned</option>
            {agentNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="queue-sort" className="block text-xs font-medium text-neutral-600 mb-1">
            Sort by
          </label>
          <select
            id="queue-sort"
            name="sort"
            defaultValue={query.sort ?? "urgency"}
            className="min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
          >
            <option value="urgency">Highest urgency</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="min-h-11 rounded-md bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-700"
          >
            Apply
          </button>
          {filtered && (
            <Link
              href="/"
              className="min-h-11 inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500" role="status">
          {result.total} complaint{result.total === 1 ? "" : "s"}
          {filtered ? " match" : ""}
          {result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : ""}
        </p>
        <SaveViewButton query={pageHref(query, 1).split("?")[1] ?? ""} />
      </div>

      {result.complaints.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No complaints match"
            hint="Try different search terms or clear the filters."
          />
        ) : (
          <EmptyState title="No complaints yet" hint="Submit one from the New Complaint button above." />
        )
      ) : (
        <QueueList complaints={result.complaints} />
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Complaint list pages" className="flex items-center justify-between text-sm">
          {result.page > 1 ? (
            <Link
              href={pageHref(query, result.page - 1)}
              className="min-h-11 inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 hover:bg-neutral-50"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-neutral-500">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link
              href={pageHref(query, result.page + 1)}
              className="min-h-11 inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 hover:bg-neutral-50"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
