import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/data/complaints";
import { StatusBadge, PriorityBadge, CategoryChip } from "@/components/badges";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  let stats;
  try {
    stats = await getDashboardStats(supabase);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <ErrorBanner message="Couldn't load dashboard data. Check the database connection and try again." />
      </div>
    );
  }

  const totalAll = stats.totalOpen + stats.totalInProgress + stats.totalResolved;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {totalAll === 0 ? (
        <EmptyState title="No complaints yet" hint="Once complaints come in, stats will show up here." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile label="Open" value={stats.totalOpen} accent="text-blue-700" />
            <StatTile label="In Progress" value={stats.totalInProgress} accent="text-amber-700" />
            <StatTile label="Resolved" value={stats.totalResolved} accent="text-emerald-700" />
          </div>

          <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-medium text-neutral-500">Open Complaints by Category</h2>
            {stats.byCategory.length === 0 ? (
              <p className="text-sm text-neutral-400">No open complaints.</p>
            ) : (
              <ul className="space-y-2">
                {stats.byCategory.map((cat) => (
                  <li key={cat.name} className="flex items-center gap-3">
                    <CategoryChip name={cat.name} color={cat.color} />
                    <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, (cat.count / Math.max(...stats.byCategory.map((c) => c.count))) * 100)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <span className="text-sm text-neutral-600 w-6 text-right">{cat.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-medium text-neutral-500">Top Priority Queue</h2>
            {stats.priorityQueue.length === 0 ? (
              <p className="text-sm text-neutral-400">No open complaints with an urgency score yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.priorityQueue.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/complaints/${c.id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-neutral-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge status={c.status} />
                        <PriorityBadge priority={c.priority} />
                        <span className="truncate text-sm text-neutral-800">{c.caller_name}</span>
                      </div>
                      <span className="text-sm font-medium text-neutral-900 whitespace-nowrap">
                        {c.urgency_score?.toFixed(1)} / 10
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}
