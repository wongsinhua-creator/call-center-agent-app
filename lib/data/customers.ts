import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplaintWithCategory } from "@/lib/types";
import { getComplaints } from "./complaints";

// Groups unclosed (open / in-progress) complaints by customer so repeat
// callers are tracked as one case load. Identity heuristic: normalized phone
// number when present (most reliable), otherwise case-insensitive name.

export interface CustomerGroup {
  key: string;
  name: string;
  phone: string | null;
  complaints: ComplaintWithCategory[];
  maxUrgency: number | null;
  oldestCreatedAt: string;
  hasHighPriority: boolean;
}

function customerKey(c: ComplaintWithCategory): string {
  const digits = (c.caller_phone ?? "").replace(/\D/g, "");
  if (digits.length >= 7) return `phone:${digits}`;
  return `name:${c.caller_name.trim().toLowerCase()}`;
}

export function groupByCustomer(complaints: ComplaintWithCategory[]): CustomerGroup[] {
  const unclosed = complaints.filter((c) => c.status !== "resolved");
  const groups = new Map<string, CustomerGroup>();

  for (const c of unclosed) {
    const key = customerKey(c);
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: c.caller_name,
        phone: c.caller_phone,
        complaints: [],
        maxUrgency: null,
        oldestCreatedAt: c.created_at,
        hasHighPriority: false,
      };
      groups.set(key, g);
    }
    g.complaints.push(c);
    if (c.urgency_score !== null && (g.maxUrgency === null || c.urgency_score > g.maxUrgency)) {
      g.maxUrgency = c.urgency_score;
    }
    if (new Date(c.created_at) < new Date(g.oldestCreatedAt)) g.oldestCreatedAt = c.created_at;
    if (c.priority === "high") g.hasHighPriority = true;
  }

  for (const g of groups.values()) {
    g.complaints.sort(
      (a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0) || a.created_at.localeCompare(b.created_at),
    );
  }

  // Repeat callers first (they need the tracking most), then by urgency.
  return [...groups.values()].sort(
    (a, b) => b.complaints.length - a.complaints.length || (b.maxUrgency ?? 0) - (a.maxUrgency ?? 0),
  );
}

export async function getCustomerGroups(supabase: SupabaseClient): Promise<CustomerGroup[]> {
  return groupByCustomer(await getComplaints(supabase));
}
