import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export function isAdminUser(user: User | null): boolean {
  return (user?.app_metadata as Record<string, unknown> | undefined)?.role === "admin";
}

// Returns the signed-in admin, or null when unauthenticated / not an admin.
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}
