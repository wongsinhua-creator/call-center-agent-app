import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { closeOpenSegments, openSegment } from "@/lib/handlers";
import { withErrorHandling } from "@/lib/api";

export const maxDuration = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK = 25;

// Bulk-assign a handling agent to several complaints at once (report P1:
// queue power tools). Same per-complaint semantics as a single PATCH:
// audited assignment + handling-segment handoff, RLS-scoped throughout.
export const POST = withErrorHandling(async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  const handledBy =
    typeof body.handled_by === "string" ? body.handled_by.trim().slice(0, 100) || null : null;

  if (ids.length === 0 || ids.length > MAX_BULK || ids.some((id) => !UUID_RE.test(id))) {
    return NextResponse.json(
      { error: `Select between 1 and ${MAX_BULK} complaints.` },
      { status: 400 },
    );
  }
  if (!handledBy) {
    return NextResponse.json({ error: "Enter the agent name to assign." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorName = user?.email ?? handledBy;

  let updated = 0;
  const failed: string[] = [];

  for (const id of ids) {
    const { data: current, error: fetchError } = await supabase
      .from("complaints")
      .select("id, user_id, status, handled_by")
      .eq("id", id)
      .maybeSingle();
    if (fetchError || !current) {
      failed.push(id);
      continue;
    }
    if (current.handled_by === handledBy) {
      updated += 1; // already assigned — idempotent
      continue;
    }

    const { error: updateError } = await supabase
      .from("complaints")
      .update({ handled_by: handledBy })
      .eq("id", id);
    if (updateError) {
      failed.push(id);
      continue;
    }

    await writeAuditLog(supabase, {
      complaintId: id,
      userId: current.user_id,
      action: "assigned",
      actor: "agent",
      actorName,
      oldValue: current.handled_by ?? "unassigned",
      newValue: handledBy,
    });
    await closeOpenSegments(supabase, id);
    if (current.status !== "resolved") {
      await openSegment(supabase, { complaintId: id, userId: current.user_id, agentName: handledBy });
    }
    updated += 1;
  }

  return NextResponse.json({ updated, failed: failed.length });
});
