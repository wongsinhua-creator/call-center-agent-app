import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import type { Status } from "@/lib/types";

const STATUSES: Status[] = ["open", "in_progress", "resolved"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("complaints")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[complaints/patch] fetch failed", fetchError);
    return NextResponse.json({ error: "Failed to load complaint" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const auditEntries: Parameters<typeof writeAuditLog>[1][] = [];

  // Who acted: the signed-in agent, else the handling agent on record (demo mode).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const newHandledBy =
    typeof body.handled_by === "string" ? body.handled_by.trim().slice(0, 100) || null : undefined;
  const actorName =
    user?.email ?? newHandledBy ?? current.handled_by ?? "anonymous";

  // Handling-agent assignment / reassignment / unassignment.
  if (newHandledBy !== undefined && newHandledBy !== current.handled_by) {
    updates.handled_by = newHandledBy;
    auditEntries.push({
      complaintId: id,
      userId: current.user_id,
      action: "assigned",
      actor: "agent",
      actorName,
      oldValue: current.handled_by ?? "unassigned",
      newValue: newHandledBy ?? "unassigned",
    });
  }

  // Status change (dropdown save / Mark Resolved). Idempotent: re-submitting
  // the same status is a no-op, so double-clicks never write duplicate rows.
  if (typeof body.status === "string" && body.status !== current.status) {
    if (!STATUSES.includes(body.status as Status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === "resolved") {
      updates.resolved_at = new Date().toISOString();
      if (typeof body.resolution_notes === "string") {
        updates.resolution_notes = body.resolution_notes.trim().slice(0, 5000);
      }
    } else if (current.status === "resolved") {
      updates.resolved_at = null;
    }
    auditEntries.push({
      complaintId: id,
      userId: current.user_id,
      action: "status_change",
      actor: "agent",
      actorName,
      oldValue: current.status,
      newValue: body.status,
    });
  } else if (typeof body.resolution_notes === "string" && current.status === "resolved") {
    // Editing notes on an already-resolved complaint, no status transition.
    updates.resolution_notes = body.resolution_notes.trim().slice(0, 5000);
  }

  // Category override via dropdown.
  if (typeof body.category_id === "string" && body.category_id !== current.category_id) {
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name");
    if (catError) {
      console.error("[complaints/patch] categories fetch failed", catError);
      return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
    }
    const newCategory = categories?.find((c) => c.id === body.category_id);
    const oldCategory = categories?.find((c) => c.id === current.category_id);
    if (!newCategory) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    updates.category_id = newCategory.id;
    updates.category_ai_review_status =
      newCategory.name === current.category_ai ? "confirmed" : "overridden";

    auditEntries.push({
      complaintId: id,
      userId: current.user_id,
      action: "category_override",
      actor: "agent",
      actorName,
      oldValue: oldCategory?.name ?? "none",
      newValue: newCategory.name,
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { error: updateError } = await supabase.from("complaints").update(updates).eq("id", id);
  if (updateError) {
    console.error("[complaints/patch] update failed", updateError);
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
  }

  for (const entry of auditEntries) {
    await writeAuditLog(supabase, entry);
  }

  return NextResponse.json({ ok: true });
}
