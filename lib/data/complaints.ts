import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, Category, ComplaintWithCategory } from "@/lib/types";

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

export interface DashboardStats {
  totalOpen: number;
  totalInProgress: number;
  totalResolved: number;
  byCategory: { name: string; color: string; count: number }[];
  priorityQueue: ComplaintWithCategory[];
}

export async function getDashboardStats(supabase: SupabaseClient): Promise<DashboardStats> {
  const complaints = await getComplaints(supabase);

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

  const priorityQueue = openComplaints
    .filter((c) => c.urgency_score !== null)
    .sort((a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0))
    .slice(0, 5);

  return {
    totalOpen,
    totalInProgress,
    totalResolved,
    byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.count - a.count),
    priorityQueue,
  };
}
