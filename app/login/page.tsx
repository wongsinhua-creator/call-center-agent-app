import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "./AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agent Sign In</h1>
        <p className="text-sm text-neutral-500">
          Sign in for a private workspace — your complaints are visible only to you.
          No account is needed to try the public demo.
        </p>
      </div>
      <AuthForm />
    </div>
  );
}
