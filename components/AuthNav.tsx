import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function AuthNav() {
  let email: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  } catch {
    // Render the signed-out state if the auth check fails.
  }

  if (!email) {
    return (
      <Link href="/login" className="text-neutral-600 hover:text-neutral-900 whitespace-nowrap">
        Sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-2 text-neutral-600">
      <span className="hidden sm:inline max-w-40 truncate" title={email}>
        {email}
      </span>
      <SignOutButton />
    </span>
  );
}
