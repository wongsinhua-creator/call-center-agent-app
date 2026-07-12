import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, Category, ComplaintHandler, ComplaintWithCategory } from "@/lib/types";

const COMPLAINT_SELECT = "*, category:categories(*)";

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getComplaints(supabase: SupabaseClient): Promise<ComplaintWithCategory[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select(COMPLAINT_SELECT)
    .order("urgency_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ComplaintWithCategory[];
}

export interface QueueQuery {
  q?: string; // matches caller name or description
  status?: "open" | "in_progress" | "resolved";
  sort?: "urgency" | "newest" | "oldest";
  page?: number; // 1-based
  pageSize?: number;
}

export interface QueuePage {
  complaints: ComplaintWithCategory[];
  total: number;
  page: number;
  pageCount: number;
}

// Server-side queue: search, filter, sort, and paginate in the database so
// large queues stay fast. URL-driven, so any filtered view is shareable.
export async function getComplaintQueue(
  supabase: SupabaseClient,
  query: QueueQuery,
): Promise<QueuePage> {
  const pageSize = query.pageSize ?? 10;
  let builder = supabase.from("complaints").select(COMPLAINT_SELECT, { count: "exact" });

  if (query.q) {
    // Escape PostgREST pattern metacharacters, then match either field.
    const term = query.q.replace(/[%_,()]/g, " ").trim().slice(0, 100);
    if (term) builder = builder.or(`caller_name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (query.status) builder = builder.eq("status", query.status);

  if (query.sort === "newest") builder = builder.order("created_at", { ascending: false });
  else if (query.sort === "oldest") builder = builder.order("created_at", { ascending: true });
  else
    builder = builder
      .order("urgency_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

  const requestedPage = Math.max(1, query.page ?? 1);
  const from = (requestedPage - 1) * pageSize;
  const { data, error, count } = await builder.range(from, from + pageSize - 1);
  // Out-of-range pages return a PostgREST range error — treat as empty page.
  if (error && !/range/i.test(error.message ?? "")) throw error;

  const total = count ?? 0;
  return {
    complaints: (data ?? []) as unknown as ComplaintWithCategory[],
    total,
    page: requestedPage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getComplaint(
  supabase: SupabaseClient,
  id: string,
): Promise<ComplaintWithCategory | null> {
  const { data, error } = await supabase
    .from("complaints")
    .select(COMPLAINT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ComplaintWithCategory | null;
}

export async function getAuditLogs(supabase: SupabaseClient, complaintId: string): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getHandlers(
  supabase: SupabaseClient,
  complaintId: string,
): Promise<ComplaintHandler[]> {
  const { data, error } = await supabase
    .from("complaint_handlers")
    .select("*")
    .eq("complaint_id", complaintId)
    .order("started_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface AgentKpi {
  name: string;
  portionsHandled: number;
  complaintsClosed: number;
  avgCloseMs: number | null;
}

export interface ClosureKpis {
  closureRate: number; // resolved / total, 0–1
  avgCloseMs: number | null; // mean created_at → resolved_at
  fastestCloseMs: number | null;
  slowestCloseMs: number | null;
}

export interface DashboardStats {
  totalOpen: number;
  totalInProgress: number;
  totalResolved: number;
  byCategory: { name: string; color: string; count: number }[];
  byAgent: { name: string; count: number }[];
  unassignedCount: number;
  priorityQueue: ComplaintWithCategory[];
  closure: ClosureKpis;
  agentKpis: AgentKpi[];
}

export async function getDashboardStats(supabase: SupabaseClient): Promise<DashboardStats> {
  const complaints = await getComplaints(supabase);
  const { data: handlerRows, error: handlersError } = await supabase
    .from("complaint_handlers")
    .select("*");
  if (handlersError) throw handlersError;
  const handlers: ComplaintHandler[] = handlerRows ?? [];

  const totalOpen = complaints.filter((c) => c.status === "open").length;
  const totalInProgress = complaints.filter((c) => c.status === "in_progress").length;
  const totalResolved = complaints.filter((c) => c.status === "resolved").length;

  const openComplaints = complaints.filter((c) => c.status !== "resolved");
  const byCategoryMap = new Map<string, { name: string; color: string; count: number }>();
  for (const c of openComplaints) {
    const name = c.category?.name ?? "Uncategorized";
    const color = c.category?.color ?? "#9ca3af";
    const existing = byCategoryMap.get(name);
    if (existing) existing.count += 1;
    else byCategoryMap.set(name, { name, color, count: 1 });
  }

  const byAgentMap = new Map<string, number>();
  let unassignedCount = 0;
  for (const c of openComplaints) {
    if (c.handled_by) byAgentMap.set(c.handled_by, (byAgentMap.get(c.handled_by) ?? 0) + 1);
    else unassignedCount += 1;
  }

  const priorityQueue = openComplaints
    .filter((c) => c.urgency_score !== null)
    .sort((a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0))
    .slice(0, 5);

  // Closure KPIs: time-to-close over resolved complaints with a resolved_at.
  const closeTimes = complaints
    .filter((c) => c.status === "resolved" && c.resolved_at)
    .map((c) => new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime())
    .filter((ms) => ms >= 0);
  const closure: ClosureKpis = {
    closureRate: complaints.length > 0 ? totalResolved / complaints.length : 0,
    avgCloseMs:
      closeTimes.length > 0 ? closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length : null,
    fastestCloseMs: closeTimes.length > 0 ? Math.min(...closeTimes) : null,
    slowestCloseMs: closeTimes.length > 0 ? Math.max(...closeTimes) : null,
  };

  // Per-agent KPIs: portions from handling segments; closures credited to the
  // agent holding the complaint when it was resolved.
  const agentMap = new Map<string, AgentKpi & { closeSum: number }>();
  const agentOf = (name: string) => {
    let a = agentMap.get(name);
    if (!a) {
      a = { name, portionsHandled: 0, complaintsClosed: 0, avgCloseMs: null, closeSum: 0 };
      agentMap.set(name, a);
    }
    return a;
  };
  for (const h of handlers) {
    agentOf(h.agent_name).portionsHandled += 1;
  }
  for (const c of complaints) {
    if (c.status === "resolved" && c.handled_by) {
      const a = agentOf(c.handled_by);
      a.complaintsClosed += 1;
      if (c.resolved_at) {
        a.closeSum += new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime();
      }
    }
  }
  const agentKpis: AgentKpi[] = Array.from(agentMap.values())
    .map(({ closeSum, ...a }) => ({
      ...a,
      avgCloseMs: a.complaintsClosed > 0 && closeSum > 0 ? closeSum / a.complaintsClosed : null,
    }))
    .sort((x, y) => y.complaintsClosed - x.complaintsClosed || y.portionsHandled - x.portionsHandled);

  return {
    totalOpen,
    totalInProgress,
    totalResolved,
    byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.count - a.count),
    byAgent: Array.from(byAgentMap, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count,
    ),
    unassignedCount,
    priorityQueue,
    closure,
    agentKpis,
  };
}
