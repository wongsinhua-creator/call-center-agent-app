import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditAction, Actor } from "@/lib/types";

export async function writeAuditLog(
  supabase: SupabaseClient,
  params: {
    complaintId: string;
    userId: string;
    action: AuditAction;
    actor: Actor;
    actorName?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    complaint_id: params.complaintId,
    user_id: params.userId,
    action: params.action,
    actor: params.actor,
    actor_name: params.actorName ?? null,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
  });
  if (error) {
    // Audit logging must never take down the primary action it's recording.
    console.error("[audit_log] insert failed", error);
  }
}
