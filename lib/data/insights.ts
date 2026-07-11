import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, ComplaintHandler, ComplaintWithCategory } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { getComplaints } from "./complaints";

// Deterministic bottleneck analysis over live data — no AI required, so it
// works under the same "AI-off guarantee" as the rest of the app. Each
// detected bottleneck pairs evidence (the numbers) with a concrete workflow
// recommendation.

export interface Insight {
  id: string;
  severity: "high" | "medium" | "info";
  title: string;
  evidence: string;
  recommendation: string;
}

const HOUR = 3_600_000;

// Thresholds (tuned for a call-center day, documented on the page):
const HIGH_PRIORITY_AGE_H = 4; // high-priority complaint untouched this long → escalate
const AGE_MEDIUM_H = 24; // any open complaint older than this → aging
const AGE_HIGH_H = 48; // ...and this old → critical aging
const FIRST_RESPONSE_TARGET_H = 4; // avg time from created → in_progress
const CHURN_SEGMENTS = 3; // a complaint that changed hands this often → churn

export function analyzeBottlenecks(
  complaints: ComplaintWithCategory[],
  handlers: ComplaintHandler[],
  auditLogs: AuditLog[],
  now: number = Date.now(),
): Insight[] {
  const insights: Insight[] = [];
  const open = complaints.filter((c) => c.status !== "resolved");

  // 1. Aging queue — complaints stuck without resolution.
  const agingHigh = open.filter(
    (c) =>
      (c.priority === "high" && now - new Date(c.created_at).getTime() > HIGH_PRIORITY_AGE_H * HOUR) ||
      now - new Date(c.created_at).getTime() > AGE_HIGH_H * HOUR,
  );
  const agingMedium = open.filter(
    (c) => !agingHigh.includes(c) && now - new Date(c.created_at).getTime() > AGE_MEDIUM_H * HOUR,
  );
  if (agingHigh.length > 0) {
    const oldest = agingHigh.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b,
    );
    insights.push({
      id: "aging-high",
      severity: "high",
      title: `${agingHigh.length} high-priority complaint${agingHigh.length > 1 ? "s" : ""} aging in the queue`,
      evidence: `High-priority complaints older than ${HIGH_PRIORITY_AGE_H}h (or any older than ${AGE_HIGH_H}h). Oldest has waited ${formatDuration(now - new Date(oldest.created_at).getTime())}.`,
      recommendation:
        "Work the priority queue top-down: resolve or escalate these before taking new intake. If they're blocked on another team, record that in resolution notes and set a follow-up owner.",
    });
  }
  if (agingMedium.length > 0) {
    insights.push({
      id: "aging-medium",
      severity: "medium",
      title: `${agingMedium.length} complaint${agingMedium.length > 1 ? "s" : ""} open for more than ${AGE_MEDIUM_H}h`,
      evidence: `Open, non-high-priority complaints past the ${AGE_MEDIUM_H}h mark.`,
      recommendation:
        "Sweep the backlog once per shift: close what's actually done, downgrade what's stale, and assign anything still live.",
    });
  }

  // 2. Unassigned backlog — nobody owns the work.
  const unassigned = open.filter((c) => !c.handled_by);
  if (unassigned.length > 0) {
    const oldestWait = Math.max(...unassigned.map((c) => now - new Date(c.created_at).getTime()));
    const anyHigh = unassigned.some((c) => c.priority === "high");
    insights.push({
      id: "unassigned",
      severity: anyHigh ? "high" : "medium",
      title: `${unassigned.length} open complaint${unassigned.length > 1 ? "s have" : " has"} no handling agent`,
      evidence: `Longest has waited ${formatDuration(oldestWait)} with no owner${anyHigh ? ", including high-priority items" : ""}.`,
      recommendation:
        "Assign an owner at intake — unowned complaints are the most common closure bottleneck. Add a triage step: whoever takes the call puts their name on it before moving on.",
    });
  }

  // 3. First-response lag — time from created until work starts.
  const firstResponse: number[] = [];
  for (const log of auditLogs) {
    if (log.action !== "status_change" || log.old_value !== "open" || log.new_value !== "in_progress")
      continue;
    const complaint = complaints.find((c) => c.id === log.complaint_id);
    if (!complaint) continue;
    const lag = new Date(log.created_at).getTime() - new Date(complaint.created_at).getTime();
    if (lag >= 0) firstResponse.push(lag);
  }
  if (firstResponse.length > 0) {
    const avgLag = firstResponse.reduce((a, b) => a + b, 0) / firstResponse.length;
    if (avgLag > FIRST_RESPONSE_TARGET_H * HOUR) {
      insights.push({
        id: "first-response",
        severity: "medium",
        title: "Slow first response — complaints sit before work starts",
        evidence: `Average time from creation to In Progress is ${formatDuration(avgLag)} across ${firstResponse.length} complaint${firstResponse.length > 1 ? "s" : ""} (target: ${FIRST_RESPONSE_TARGET_H}h).`,
        recommendation:
          "Add an intake rotation: one agent per shift moves new complaints to In Progress within the target window, even if just to acknowledge and triage.",
      });
    }
  }

  // 4. Workload imbalance — one agent carrying the queue.
  const load = new Map<string, number>();
  for (const c of open) {
    if (c.handled_by) load.set(c.handled_by, (load.get(c.handled_by) ?? 0) + 1);
  }
  if (load.size >= 2) {
    const sorted = [...load.entries()].sort((a, b) => b[1] - a[1]);
    const [topAgent, topCount] = sorted[0];
    const rest = sorted.slice(1).reduce((sum, [, n]) => sum + n, 0);
    const avgRest = rest / (sorted.length - 1);
    if (topCount >= 3 && topCount >= 2 * avgRest) {
      insights.push({
        id: "imbalance",
        severity: "medium",
        title: `Workload concentrated on ${topAgent}`,
        evidence: `${topAgent} holds ${topCount} open complaints; the rest of the team averages ${avgRest.toFixed(1)}.`,
        recommendation: `Rebalance: hand off ${topAgent}'s lower-urgency complaints and route new intake elsewhere until the spread evens out.`,
      });
    }
  }

  // 5. Handoff churn — complaints bouncing between agents.
  const segmentsPerComplaint = new Map<string, number>();
  for (const h of handlers) {
    segmentsPerComplaint.set(h.complaint_id, (segmentsPerComplaint.get(h.complaint_id) ?? 0) + 1);
  }
  const churned = open.filter((c) => (segmentsPerComplaint.get(c.id) ?? 0) >= CHURN_SEGMENTS);
  if (churned.length > 0) {
    insights.push({
      id: "churn",
      severity: "medium",
      title: `${churned.length} open complaint${churned.length > 1 ? "s have" : " has"} changed hands ${CHURN_SEGMENTS}+ times`,
      evidence: "Frequent handoffs usually mean unclear ownership or missing context at transfer.",
      recommendation:
        "On the next handoff, require a one-line summary in the resolution notes and keep the receiving agent on it to closure. Repeated bouncing is slower than a single deep dive.",
    });
  }

  // 6. Slowest category — a systemic product-area problem.
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const c of complaints) {
    if (c.status !== "resolved" || !c.resolved_at) continue;
    const name = c.category?.name ?? c.category_ai ?? "Uncategorized";
    const ms = new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime();
    const entry = byCategory.get(name) ?? { total: 0, count: 0 };
    entry.total += ms;
    entry.count += 1;
    byCategory.set(name, entry);
  }
  if (byCategory.size >= 2) {
    const avgs = [...byCategory.entries()]
      .map(([name, { total, count }]) => ({ name, avg: total / count, count }))
      .sort((a, b) => b.avg - a.avg);
    const slowest = avgs[0];
    const fastest = avgs[avgs.length - 1];
    if (slowest.avg > 1.5 * fastest.avg) {
      insights.push({
        id: "slow-category",
        severity: "info",
        title: `${slowest.name} complaints close slowest`,
        evidence: `${slowest.name} averages ${formatDuration(slowest.avg)} to close vs ${formatDuration(fastest.avg)} for ${fastest.name}.`,
        recommendation: `Build a runbook or assign a specialist for ${slowest.name} — its closures take ${(slowest.avg / fastest.avg).toFixed(1)}× longer than the fastest category.`,
      });
    }
  }

  // 7. AI review backlog — low-confidence tags nobody confirmed.
  const unreviewed = open.filter((c) => c.category_ai && c.category_ai_review_status === "unreviewed");
  if (unreviewed.length > 0) {
    insights.push({
      id: "ai-review",
      severity: "info",
      title: `${unreviewed.length} AI categor${unreviewed.length > 1 ? "ies" : "y"} awaiting agent review`,
      evidence: "Unreviewed tags can misroute complaints and skew the category breakdown.",
      recommendation:
        "When opening a complaint, confirm or override the AI category — it takes one click and keeps routing and reporting trustworthy.",
    });
  }

  const rank = { high: 0, medium: 1, info: 2 };
  return insights.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export interface InsightsData {
  insights: Insight[];
  openCount: number;
  analyzedCount: number;
}

export async function getInsights(supabase: SupabaseClient): Promise<InsightsData> {
  const complaints = await getComplaints(supabase);
  const [{ data: handlerRows, error: hErr }, { data: logRows, error: lErr }] = await Promise.all([
    supabase.from("complaint_handlers").select("*"),
    supabase.from("audit_logs").select("*"),
  ]);
  if (hErr) throw hErr;
  if (lErr) throw lErr;

  return {
    insights: analyzeBottlenecks(complaints, handlerRows ?? [], logRows ?? []),
    openCount: complaints.filter((c) => c.status !== "resolved").length,
    analyzedCount: complaints.length,
  };
}
