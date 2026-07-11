import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { getAdminUser } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAgent, toAgentAccount } from "@/lib/agents";

export const maxDuration = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET = withErrorHandling(async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    console.error("[admin/agents] list failed", error);
    return NextResponse.json({ error: "Failed to list agents" }, { status: 500 });
  }

  return NextResponse.json({ agents: data.users.filter(isAgent).map(toAgentAccount) });
});

export const POST = withErrorHandling(async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim().slice(0, 100);

  const errors: Record<string, string> = {};
  if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Enter a valid email.";
  if (password.length < 8 || password.length > 72)
    errors.password = "Password must be 8–72 characters.";
  if (!name) errors.name = "Agent name is required.";
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // admin-created accounts skip email confirmation
    user_metadata: { full_name: name },
    app_metadata: { role: "agent" },
  });
  if (error) {
    const conflict = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: conflict ? "An account with this email already exists." : "Failed to create agent" },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ agent: toAgentAccount(data.user) }, { status: 201 });
});
