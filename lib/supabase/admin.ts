import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { timeoutFetch } from "@/lib/guard";

// Service-role client for auth administration. Server-only: imported
// exclusively from app/api/admin/* routes and the /admin server page
// (docs/SECURITY.md — the service key never reaches the browser).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: timeoutFetch() },
  });
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
