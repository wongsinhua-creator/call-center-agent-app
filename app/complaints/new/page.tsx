import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data/complaints";
import { NewComplaintForm } from "./NewComplaintForm";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewComplaintPage() {
  const supabase = await createClient();

  let categories: Category[] = [];
  try {
    categories = await getCategories(supabase);
  } catch {
    // Categories are a convenience for pre-selecting; the AI still tags on
    // submit even if this list fails to load.
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New Complaint</h1>
      <NewComplaintForm categories={categories} />
    </div>
  );
}
