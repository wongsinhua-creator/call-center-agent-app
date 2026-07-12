"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sign-in only: agent and administrator accounts are provisioned by an
// administrator via /admin — there is no self-service registration.
export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          /banned/i.test(error.message)
            ? "This account has been disabled by an administrator."
            : error.message,
        );
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-neutral-200 rounded-lg p-6">
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">{error}</div>
      )}

      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="agent@example.com"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
        <input
          id="login-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full min-h-11 rounded-md bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-700 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-center text-xs text-neutral-400">
        Accounts are created by an administrator. Contact yours if you need access.
      </p>
    </form>
  );
}
