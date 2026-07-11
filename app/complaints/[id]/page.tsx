import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getComplaint, getAuditLogs, getCategories } from "@/lib/data/complaints";
import { ComplaintDetail } from "./ComplaintDetail";
import { ErrorBanner } from "@/components/ErrorBanner";

export const dynamic = "force-dynamic";

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let complaint;
  try {
    complaint = await getComplaint(supabase, id);
  } catch {
    return <ErrorBanner message="Couldn't load this complaint. Check the database connection and try again." />;
  }

  if (!complaint) notFound();

  const [auditLogs, categories] = await Promise.all([
    getAuditLogs(supabase, id),
    getCategories(supabase),
  ]);

  return <ComplaintDetail complaint={complaint} auditLogs={auditLogs} categories={categories} />;
}
