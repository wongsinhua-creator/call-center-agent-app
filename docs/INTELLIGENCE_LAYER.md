# Intelligence Layer

## Messy Input
Free-text complaint description from agent, e.g.:
> "Customer says they were charged twice and wants their money back immediately."

## Auto-Structure Output (JSON from AI)
```json
{
  "category_ai": "Billing",
  "urgency_score": 9.1,
  "source": "openai/gpt-4o",
  "confidence": 0.97,
  "review_status": "unreviewed"
}
```

## Events That Trigger AI
- `complaint.created` → categorize + score (auto, low risk)

## Scoring Rules (rule-based baseline, AI on top)
| Signal | Urgency Bump |
|---|---|
| Keywords: refund, duplicate charge, down, outage | +2–3 |
| Channel = phone (live) | +1 |
| Description length > 200 chars | +0.5 |
| Category = Technical | +1 |

Score range 0–10; ≥ 8 = high priority auto-set.

## What Gets Ranked
- Dashboard priority queue sorts complaints by `urgency_score DESC`
- Category breakdown counts open complaints per category

## v1 vs Later
| v1 | Later |
|---|---|
| Auto-tag + urgency score on submit | AI-drafted response suggestion |
| Agent can override AI category | AI learns from overrides |
| Confidence badge shown in UI | SLA breach prediction |
