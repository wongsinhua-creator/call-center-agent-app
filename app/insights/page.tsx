import { createClient } from "@/lib/supabase/server";
import { getInsights, type Insight } from "@/lib/data/insights";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";

export const dynamic = "force-dynamic";

const SEVERITY_STYLES: Record<Insight["severity"], { label: string; badge: string; border: string }> = {
  high: { label: "Bottleneck", badge: "bg-red-100 text-red-800", border: "border-red-200" },
  medium: { label: "Slowdown", badge: "bg-amber-100 text-amber-800", border: "border-amber-200" },
  info: { label: "Tune-up", badge: "bg-blue-100 text-blue-800", border: "border-blue-200" },
};

export default async function InsightsPage() {
  const supabase = await createClient();

  let data;
  try {
    data = await getInsights(supabase);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Workflow Insights</h1>
        <ErrorBanner message="Couldn't analyze the queue. Check the database connection and try again." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workflow Insights</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Bottleneck analysis over {data.analyzedCount} complaint{data.analyzedCount === 1 ? "" : "s"}{" "}
          ({data.openCount} open) — each finding pairs the evidence with a concrete workflow change.
        </p>
      </div>

      {data.analyzedCount === 0 ? (
        <EmptyState title="Nothing to analyze yet" hint="Insights appear once complaints start coming in." />
      ) : data.insights.length === 0 ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-6 text-center">
          <p className="font-medium">No bottlenecks detected</p>
          <p className="text-sm mt-1">
            Queue is healthy: nothing aging, everything owned, workload balanced.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {data.insights.map((insight) => {
            const style = SEVERITY_STYLES[insight.severity];
            return (
              <li
                key={insight.id}
                className={`bg-white border ${style.border} rounded-lg p-5 space-y-2`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                    {style.label}
                  </span>
                  <h2 className="font-medium text-neutral-900">{insight.title}</h2>
                </div>
                <p className="text-sm text-neutral-600">{insight.evidence}</p>
                <p className="text-sm text-neutral-900">
                  <span className="font-medium">Recommendation:</span> {insight.recommendation}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-neutral-400">
        How it works: deterministic rules over live data — queue age (&gt;4h high-priority, &gt;24h/48h
        any), unowned complaints, first-response lag from the audit trail, per-agent load spread,
        handling-segment churn, per-category close times, and unreviewed AI tags. Refreshes on every
        page load.
      </p>
    </div>
  );
}
