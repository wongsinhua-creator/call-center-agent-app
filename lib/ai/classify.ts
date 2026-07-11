import { redactPii } from "./pii";
import { withRetry } from "@/lib/guard";

export const CATEGORY_NAMES = ["Billing", "Technical", "Service Quality"] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

export interface ClassifyResult {
  category: CategoryName;
  urgencyScore: number;
  confidence: number;
  source: string;
}

const CATEGORY_KEYWORDS: Record<CategoryName, string[]> = {
  Billing: ["charge", "refund", "bill", "payment", "subscription", "invoice", "price", "discount"],
  Technical: ["crash", "bug", "error", "down", "outage", "not working", "broken", "app", "login", "password", "internet"],
  "Service Quality": ["rude", "agent", "unhelpful", "hold", "waited", "wait time", "no one", "ignored"],
};

const URGENT_KEYWORDS = ["refund", "duplicate charge", "down", "outage", "immediately", "no estimated"];

// Deterministic baseline per docs/INTELLIGENCE_LAYER.md — always available,
// used as the fallback when OpenAI is unavailable or errors, and as the
// starting point OpenAI is asked to refine.
export function ruleBasedClassify(description: string, channel: string): ClassifyResult {
  const text = description.toLowerCase();

  let bestCategory: CategoryName = "Service Quality";
  let bestHits = -1;
  for (const name of CATEGORY_NAMES) {
    const hits = CATEGORY_KEYWORDS[name].filter((k) => text.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      bestCategory = name;
    }
  }

  let urgency = 3;
  if (URGENT_KEYWORDS.some((k) => text.includes(k))) urgency += 2.5;
  if (channel === "phone") urgency += 1;
  if (description.length > 200) urgency += 0.5;
  if (bestCategory === "Technical") urgency += 1;
  urgency = Math.min(10, Math.max(0, urgency));

  return {
    category: bestCategory,
    urgencyScore: Number(urgency.toFixed(1)),
    confidence: 0.6,
    source: "rule-based",
  };
}

async function openaiClassify(description: string, channel: string): Promise<ClassifyResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const baseline = ruleBasedClassify(description, channel);
  const safeDescription = redactPii(description).slice(0, 2000);

  // Each attempt aborts after 3s; withRetry caps the whole thing at 5
  // attempts within an 8s deadline, then the rule-based fallback takes over.
  return withRetry(async () => openaiAttempt(apiKey, baseline, safeDescription), {
    maxAttempts: 5,
    deadlineMs: 8000,
  });
}

async function openaiAttempt(
  apiKey: string,
  baseline: ClassifyResult,
  safeDescription: string,
): Promise<ClassifyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You triage call-center complaints for a support team. Given a complaint description ` +
              `and channel, return strict JSON: {"category": one of ${JSON.stringify(CATEGORY_NAMES)}, ` +
              `"urgency_score": number 0-10, "confidence": number 0-1}. ` +
              `Urgency signals: refunds/duplicate charges/outages/downtime raise urgency; phone channel ` +
              `is more urgent than chat/email; long descriptions and Technical category raise urgency. ` +
              `A rule-based baseline guess is category=${baseline.category}, urgency_score=${baseline.urgencyScore} — ` +
              `use it as a prior but override it when the text clearly indicates otherwise.`,
          },
          { role: "user", content: safeDescription },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI response missing content");

    const parsed = JSON.parse(content);
    const category = CATEGORY_NAMES.includes(parsed.category) ? parsed.category : baseline.category;
    const urgencyScore = Number(parsed.urgency_score);
    const confidence = Number(parsed.confidence);

    return {
      category,
      urgencyScore: Number.isFinite(urgencyScore) ? Math.min(10, Math.max(0, urgencyScore)) : baseline.urgencyScore,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.8,
      source: "openai/gpt-4o-mini",
    };
  } finally {
    clearTimeout(timeout);
  }
}

// The named `openai_classify` tool from docs/AGENTIC_LAYER.md. Never throws —
// falls back to the rule-based baseline so a complaint always gets tagged
// (docs/ARCHITECTURE.md "AI-Off Guarantee": core functionality never breaks).
export async function classifyComplaint(description: string, channel: string): Promise<ClassifyResult> {
  try {
    return await openaiClassify(description, channel);
  } catch {
    return ruleBasedClassify(description, channel);
  }
}

export function priorityFromUrgency(score: number | null): "low" | "medium" | "high" {
  if (score === null) return "medium";
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}
