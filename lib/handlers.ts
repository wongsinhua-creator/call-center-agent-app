import type { SupabaseClient } from "@supabase/supabase-js";

// Handling-segment lifecycle. Failures are logged but never take down the
// primary action (same policy as audit logging).

export async function closeOpenSegments(supabase: SupabaseClient, complaintId: string) {
  const { error } = await supabase
    .from("complaint_handlers")
    .update({ ended_at: new Date().toISOString() })
    .eq("complaint_id", complaintId)
    .is("ended_at", null);
  if (error) console.error("[handlers] close failed", error);
}

export async function openSegment(
  supabase: SupabaseClient,
  params: { complaintId: string; userId: string | null; agentName: string },
) {
  const { error } = await supabase.from("complaint_handlers").insert({
    complaint_id: params.complaintId,
    user_id: params.userId,
    agent_name: params.agentName,
  });
  if (error) console.error("[handlers] open failed", error);
}
