import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyComplaint, priorityFromUrgency } from "@/lib/ai/classify";
import { writeAuditLog } from "@/lib/audit";
import { openSegment } from "@/lib/handlers";
import { DEMO_USER_ID } from "@/lib/demo";
import { withErrorHandling } from "@/lib/api";

const CHANNELS = ["phone", "chat", "email"];
const MIN_DESCRIPTION_LENGTH = 10;

// Hard platform ceiling: the function is killed after 10s, so no code path
// (loop or hang) can run past the response deadline.
export const maxDuration = 10;

export const POST = withErrorHandling(async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const callerName = String(body.caller_name ?? "").trim();
  const callerPhone = body.caller_phone ? String(body.caller_phone).trim() : null;
  const channel = String(body.channel ?? "").trim();
  const description = String(body.description ?? "").trim();
  const categoryId = body.category_id ? String(body.category_id) : null;

  const errors: Record<string, string> = {};
  if (!callerName) errors.caller_name = "Caller name is required.";
  if (callerName.length > 100) errors.caller_name = "Caller name must be 100 characters or fewer.";
  if (callerPhone && callerPhone.length > 30) errors.caller_phone = "Phone must be 30 characters or fewer.";
  if (!CHANNELS.includes(channel)) errors.channel = "Select a valid channel.";
  if (description.length < MIN_DESCRIPTION_LENGTH) {
    errors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`;
  }
  if (description.length > 5000) {
    errors.description = "Description must be 5000 characters or fewer.";
  }
  if (categoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
    errors.category_id = "Invalid category.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 });
  }

  const supabase = await createClient();

  // Owner scoping: authenticated agents own their rows; anonymous submissions
  // land in the public demo pool. RLS enforces both (0002_lock_down.sql).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerId = user?.id ?? DEMO_USER_ID;
  const handledBy = body.handled_by
    ? String(body.handled_by).trim().slice(0, 100) || null
    : null;
  // Who acted: the signed-in agent, else the agent who took the call (demo mode).
  const actorName = user?.email ?? handledBy ?? "anonymous";

  let categoryAi: string | null = null;
  let categoryAiSource: string | null = null;
  let categoryAiConfidence: number | null = null;
  let urgencyScore: number | null = null;
  let urgencyScoreSource: string | null = null;
  let urgencyScoreConfidence: number | null = null;

  try {
    const result = await classifyComplaint(description, channel);
    categoryAi = result.category;
    categoryAiSource = result.source;
    categoryAiConfidence = result.confidence;
    urgencyScore = result.urgencyScore;
    urgencyScoreSource = result.source;
    urgencyScoreConfidence = result.confidence;
  } catch (err) {
    // AI-off guarantee: classification failure never blocks complaint creation.
    console.error("[complaints/create] classification failed", err);
  }

  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId && categoryAi) {
    const { data: match } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryAi)
      .maybeSingle();
    resolvedCategoryId = match?.id ?? null;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("complaints")
    .insert({
      user_id: ownerId,
      caller_name: callerName,
      caller_phone: callerPhone,
      channel,
      description,
      handled_by: handledBy,
      status: "open",
      priority: priorityFromUrgency(urgencyScore),
      category_id: resolvedCategoryId,
      category_ai: categoryAi,
      category_ai_source: categoryAiSource,
      category_ai_confidence: categoryAiConfidence,
      category_ai_review_status: "unreviewed",
      urgency_score: urgencyScore,
      urgency_score_source: urgencyScoreSource,
      urgency_score_confidence: urgencyScoreConfidence,
      urgency_score_review_status: "unreviewed",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[complaints/create] insert failed", insertError);
    return NextResponse.json({ error: "Failed to save complaint" }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    complaintId: inserted.id,
    userId: ownerId,
    action: "created",
    actor: "agent",
    actorName,
    newValue: "open",
  });

  if (handledBy) {
    await writeAuditLog(supabase, {
      complaintId: inserted.id,
      userId: ownerId,
      action: "assigned",
      actor: "agent",
      actorName,
      newValue: handledBy,
    });
    await openSegment(supabase, {
      complaintId: inserted.id,
      userId: ownerId,
      agentName: handledBy,
    });
  }

  if (categoryAi) {
    await writeAuditLog(supabase, {
      complaintId: inserted.id,
      userId: ownerId,
      action: "ai_tagged",
      actor: "system",
      actorName: "AI classifier",
      newValue: `${categoryAi} (urgency ${urgencyScore}, confidence ${categoryAiConfidence})`,
    });
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
});
