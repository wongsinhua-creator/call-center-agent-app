import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { getAdminUser } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { INDEFINITE_BAN, isAgent, toAgentAccount } from "@/lib/agents";

export const maxDuration = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PATCH: update profile fields and/or disable/enable the agent account.
// Disable semantics: `hours` set → banned exactly that long (auto-lifts);
// omitted → banned indefinitely until an admin re-enables.
export const PATCH = withErrorHandling(async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // This interface manages agent accounts only — admins are out of scope.
  const { data: target, error: fetchError } = await supabase.auth.admin.getUserById(id);
  if (fetchError || !target?.user) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (!isAgent(target.user)) {
    return NextResponse.json({ error: "Not an agent account" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    updates.email = email;
  }
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8 || body.password.length > 72) {
      return NextResponse.json({ error: "Password must be 8–72 characters." }, { status: 400 });
    }
    updates.password = body.password;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    updates.user_metadata = { full_name: body.name.trim().slice(0, 100) };
  }

  if (body.action === "disable") {
    const hours = body.hours === undefined || body.hours === null || body.hours === ""
      ? null
      : Number(body.hours);
    if (hours !== null && (!Number.isFinite(hours) || hours <= 0 || hours > 100_000)) {
      return NextResponse.json(
        { error: "Disable period must be a positive number of hours." },
        { status: 400 },
      );
    }
    updates.ban_duration = hours === null ? INDEFINITE_BAN : `${hours}h`;
  } else if (body.action === "enable") {
    updates.ban_duration = "none";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { data, error } = await supabase.auth.admin.updateUserById(id, updates);
  if (error) {
    console.error("[admin/agents] update failed", error);
    const conflict = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: conflict ? "An account with this email already exists." : "Failed to update agent" },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ agent: toAgentAccount(data.user) });
});
