import type { User } from "@supabase/supabase-js";

// ~100 years: the "indefinite" ban — stays until an admin re-enables.
export const INDEFINITE_BAN = "876000h";
// Bans longer than 5 years out are displayed as indefinite.
export const INDEFINITE_DISPLAY_MS = 5 * 365 * 24 * 3_600_000;

export interface AgentAccount {
  id: string;
  email: string;
  name: string;
  created_at: string;
  banned_until: string | null;
}

export function toAgentAccount(u: User): AgentAccount {
  const banned = (u as User & { banned_until?: string }).banned_until ?? null;
  return {
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata as Record<string, unknown> | undefined)?.full_name?.toString() ?? "",
    created_at: u.created_at,
    banned_until: banned && new Date(banned).getTime() > Date.now() ? banned : null,
  };
}

export function isAgent(u: User): boolean {
  return (u.app_metadata as Record<string, unknown> | undefined)?.role !== "admin";
}
