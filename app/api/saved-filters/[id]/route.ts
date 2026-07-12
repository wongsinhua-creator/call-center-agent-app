import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api";

export const maxDuration = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Removes one of the caller's own saved views (RLS restricts the delete to
// rows where user_id = auth.uid()).
export const DELETE = withErrorHandling(async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error } = await supabase.from("saved_filters").delete().eq("id", id);
  if (error) {
    console.error("[saved-filters] delete failed", error);
    return NextResponse.json({ error: "Failed to remove view" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
