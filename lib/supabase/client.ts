import { createBrowserClient } from "@supabase/ssr";
import { timeoutFetch } from "@/lib/guard";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // No client-side auth/DB call may hang: abort after the 10s deadline.
    { global: { fetch: timeoutFetch() } },
  );
}
