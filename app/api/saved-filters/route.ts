import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api";

export const maxDuration = 10;

const ALLOWED_KEYS = ["q", "status", "agent", "sort"] as const;

// Keep only the queue's known filter params so stored queries are always safe
// to re-apply as a link.
function sanitizeQuery(raw: string): string {
  const input = new URLSearchParams(raw.slice(0, 500));
  const out = new URLSearchParams();
  for (const key of ALLOWED_KEYS) {
    const v = input.get(key);
    if (v) out.set(key, v.slice(0, 100));
  }
  return out.toString();
}

export const POST = withErrorHandling(async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 60);
  if (!name) {
    return NextResponse.json({ error: "Give this view a name." }, { status: 400 });
  }
  const query = sanitizeQuery(String(body.query ?? ""));

  const { data, error } = await supabase
    .from("saved_filters")
    .insert({ user_id: user.id, name, query })
    .select("id, name, query")
    .single();
  if (error) {
    console.error("[saved-filters] insert failed", error);
    return NextResponse.json({ error: "Failed to save view" }, { status: 500 });
  }

  return NextResponse.json({ filter: data }, { status: 201 });
});
