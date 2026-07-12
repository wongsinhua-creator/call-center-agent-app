import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/adminAuth";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isAgent, toAgentAccount, type AgentAccount } from "@/lib/agents";
import { ErrorBanner } from "@/components/ErrorBanner";
import { AdminPanel } from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminUser(user)) {
    return (
      <div className="max-w-md mx-auto text-center space-y-3 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Administrators only</h1>
        {user ? (
          <p className="text-sm text-neutral-500">
            You are signed in as <span className="font-medium">{user.email}</span>, which is an
            agent account. Agent accounts cannot access administration — sign out, then sign in
            with an administrator account.
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              This area manages call-agent accounts. Sign in with an administrator account to
              continue.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-md bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-700"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    );
  }

  if (!isAdminConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Agent Accounts</h1>
        <ErrorBanner message="Admin features need SUPABASE_SERVICE_ROLE_KEY in the environment. Add it to Vercel env vars and redeploy." />
      </div>
    );
  }

  let agents: AgentAccount[];
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    agents = data.users.filter(isAgent).map(toAgentAccount);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Agent Accounts</h1>
        <ErrorBanner message="Couldn't load agent accounts. Check the service role key and try again." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Accounts</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Signed in as administrator {user!.email}. Create, update, disable, and re-enable
          call-agent logins. Disabling without a period locks the account until re-enabled.
        </p>
      </div>
      <AdminPanel initialAgents={agents} />
    </div>
  );
}
