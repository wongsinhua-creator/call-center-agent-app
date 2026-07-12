"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentAccount } from "@/lib/agents";
import { INDEFINITE_DISPLAY_MS } from "@/lib/agents";
import { formatDateTime } from "@/lib/format";

async function callApi(path: string, method: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error("The request timed out after 10 seconds. Please try again.");
    }
    throw new Error("Network error — check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function statusOf(agent: AgentAccount): { label: string; cls: string } {
  if (!agent.banned_until) return { label: "Active", cls: "bg-emerald-100 text-emerald-800" };
  const until = new Date(agent.banned_until).getTime();
  if (until - Date.now() > INDEFINITE_DISPLAY_MS)
    return { label: "Disabled indefinitely", cls: "bg-red-100 text-red-800" };
  return { label: `Disabled until ${formatDateTime(agent.banned_until)}`, cls: "bg-amber-100 text-amber-800" };
}

export function AdminPanel({ initialAgents }: { initialAgents: AgentAccount[] }) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // agent id or "create"
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePassword, setEPassword] = useState("");

  const [disableId, setDisableId] = useState<string | null>(null);
  const [disableHours, setDisableHours] = useState("");

  async function run(id: string, fn: () => Promise<unknown>, doneMsg: string) {
    if (busy) return;
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(doneMsg);
      setCreateOpen(false);
      setEditId(null);
      setDisableId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">{error}</div>
      )}
      {notice && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 text-sm">
          {notice}
        </div>
      )}

      <div>
        <button
          onClick={() => {
            setCreateOpen((v) => !v);
            setError(null);
          }}
          className="rounded-md bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-700"
        >
          {createOpen ? "Cancel" : "New Agent Account"}
        </button>
      </div>

      {createOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              "create",
              () => callApi("/api/admin/agents", "POST", { name: cName, email: cEmail, password: cPassword }),
              `Agent account created for ${cEmail.trim()}.`,
            ).then(() => {
              setCName("");
              setCEmail("");
              setCPassword("");
            });
          }}
          className="bg-white border border-neutral-200 rounded-lg p-5 grid gap-3 sm:grid-cols-3"
        >
          <div>
            <label htmlFor="adm-c-name" className="block text-xs font-medium text-neutral-600 mb-1">Agent name</label>
            <input
              id="adm-c-name"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Sam Rivera"
              className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="adm-c-email" className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
            <input
              id="adm-c-email"
              type="email"
              value={cEmail}
              onChange={(e) => setCEmail(e.target.value)}
              placeholder="sam@callcenter.test"
              className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="adm-c-password" className="block text-xs font-medium text-neutral-600 mb-1">Password (min 8 chars)</label>
            <input
              id="adm-c-password"
              type="text"
              value={cPassword}
              onChange={(e) => setCPassword(e.target.value)}
              placeholder="temporary password"
              className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={busy === "create"}
              className="rounded-md bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
            >
              {busy === "create" ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {initialAgents.length === 0 ? (
        <p className="text-sm text-neutral-500 bg-white border border-neutral-200 rounded-lg p-5">
          No agent accounts yet — create the first one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {initialAgents.map((agent) => {
            const status = statusOf(agent);
            const isBusy = busy === agent.id;
            return (
              <li key={agent.id} className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-neutral-900">{agent.name || "(no name)"}</p>
                    <p className="text-sm text-neutral-500">{agent.email}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                    {status.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    onClick={() => {
                      setEditId(editId === agent.id ? null : agent.id);
                      setEName(agent.name);
                      setEEmail(agent.email);
                      setEPassword("");
                      setDisableId(null);
                      setError(null);
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
                  >
                    Edit
                  </button>
                  {agent.banned_until ? (
                    <button
                      disabled={isBusy}
                      onClick={() =>
                        run(
                          agent.id,
                          () => callApi(`/api/admin/agents/${agent.id}`, "PATCH", { action: "enable" }),
                          `${agent.email} re-enabled.`,
                        )
                      }
                      className="rounded-md bg-emerald-700 text-white px-3 py-1.5 hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {isBusy ? "Working…" : "Re-enable"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setDisableId(disableId === agent.id ? null : agent.id);
                        setDisableHours("");
                        setEditId(null);
                        setError(null);
                      }}
                      className="rounded-md border border-red-300 text-red-700 px-3 py-1.5 hover:bg-red-50"
                    >
                      Disable
                    </button>
                  )}
                </div>

                {editId === agent.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(
                        agent.id,
                        () =>
                          callApi(`/api/admin/agents/${agent.id}`, "PATCH", {
                            name: eName,
                            email: eEmail,
                            ...(ePassword ? { password: ePassword } : {}),
                          }),
                        `${agent.email} updated.`,
                      );
                    }}
                    className="grid gap-3 sm:grid-cols-3 border-t border-neutral-100 pt-3"
                  >
                    <div>
                      <label htmlFor="adm-e-name" className="block text-xs font-medium text-neutral-600 mb-1">Name</label>
                      <input
              id="adm-e-name"
                        value={eName}
                        onChange={(e) => setEName(e.target.value)}
                        className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="adm-e-email" className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
                      <input
              id="adm-e-email"
                        type="email"
                        value={eEmail}
                        onChange={(e) => setEEmail(e.target.value)}
                        className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="adm-e-password" className="block text-xs font-medium text-neutral-600 mb-1">
                        New password (blank = keep)
                      </label>
                      <input
                        id="adm-e-password"
                        type="text"
                        value={ePassword}
                        onChange={(e) => setEPassword(e.target.value)}
                        className="w-full min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="rounded-md bg-neutral-900 text-white px-4 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-50"
                      >
                        {isBusy ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </form>
                )}

                {disableId === agent.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(
                        agent.id,
                        () =>
                          callApi(`/api/admin/agents/${agent.id}`, "PATCH", {
                            action: "disable",
                            hours: disableHours.trim() === "" ? null : Number(disableHours),
                          }),
                        disableHours.trim() === ""
                          ? `${agent.email} disabled indefinitely.`
                          : `${agent.email} disabled for ${disableHours} hours.`,
                      );
                    }}
                    className="flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-3"
                  >
                    <div>
                      <label htmlFor="adm-hours" className="block text-xs font-medium text-neutral-600 mb-1">
                        Disable period in hours — leave blank for indefinite
                      </label>
                      <input
                        id="adm-hours"
                        type="number"
                        min="1"
                        step="1"
                        value={disableHours}
                        onChange={(e) => setDisableHours(e.target.value)}
                        placeholder="e.g. 24 (blank = until re-enabled)"
                        className="w-64 min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="rounded-md bg-red-700 text-white px-4 py-1.5 text-sm hover:bg-red-600 disabled:opacity-50"
                    >
                      {isBusy ? "Disabling…" : "Confirm Disable"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
