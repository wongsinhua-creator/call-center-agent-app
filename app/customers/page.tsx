import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCustomerGroups } from "@/lib/data/customers";
import { StatusBadge, PriorityBadge, CategoryChip } from "@/components/badges";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = { phone: "Phone", chat: "Chat", email: "Email" };

export default async function CustomersPage() {
  const supabase = await createClient();

  let groups;
  try {
    groups = await getCustomerGroups(supabase);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <ErrorBanner message="Couldn't load customer groups. Check the database connection and try again." />
      </div>
    );
  }

  const repeatCallers = groups.filter((g) => g.complaints.length > 1).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-neutral-500 mt-1">
          All unclosed complaints grouped by customer
          {groups.length > 0 && (
            <>
              {" "}
              — {groups.length} customer{groups.length === 1 ? "" : "s"} with open work
              {repeatCallers > 0 &&
                `, ${repeatCallers} with multiple unclosed complaints`}
            </>
          )}
          . Matched by phone number when available, otherwise by name.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No unclosed complaints"
          hint="Every complaint is resolved — new ones will appear here grouped by caller."
        />
      ) : (
        <ul className="space-y-4">
          {groups.map((g) => (
            <li key={g.key} className="bg-white border border-neutral-200 rounded-lg">
              <div className="px-5 py-3 border-b border-neutral-100 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="font-medium text-neutral-900">{g.name}</h2>
                  {g.phone && <span className="text-xs text-neutral-500">{g.phone}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {g.complaints.length > 1 && (
                    <span className="font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Repeat caller
                    </span>
                  )}
                  <span className="text-neutral-500">
                    {g.complaints.length} unclosed
                    {g.maxUrgency !== null && ` · top urgency ${g.maxUrgency.toFixed(1)}/10`}
                  </span>
                </div>
              </div>
              <ul className="divide-y divide-neutral-100">
                {g.complaints.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/complaints/${c.id}`}
                      className="block px-5 py-3 hover:bg-neutral-50"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <StatusBadge status={c.status} />
                        <PriorityBadge priority={c.priority} />
                        <CategoryChip
                          name={c.category?.name ?? c.category_ai}
                          color={c.category?.color}
                        />
                        <span className="ml-auto text-xs text-neutral-400 whitespace-nowrap">
                          {formatDateTime(c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 line-clamp-1">
                        {CHANNEL_LABELS[c.channel] ?? c.channel} · {c.description}
                      </p>
                      <p className="text-xs mt-0.5">
                        {c.handled_by ? (
                          <span className="text-neutral-600">
                            Handling: <span className="font-medium text-neutral-800">{c.handled_by}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400">Unassigned</span>
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
