# Data Model

## categories
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid | nullable, for future owner-scoping |
| name | text | e.g. Billing, Technical |
| color | text | hex for UI badge |
| created_at | timestamptz | default now() |

## complaints
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| caller_name | text | required |
| caller_phone | text | optional |
| channel | text | phone / chat / email |
| description | text | required |
| status | text | open / in_progress / resolved |
| priority | text | low / medium / high |
| category_id | uuid FK | → categories.id (agent-set) |
| category_ai | text | **AI field** |
| category_ai_source | text | e.g. openai/gpt-4o |
| category_ai_confidence | numeric | 0–1 |
| category_ai_review_status | text | unreviewed / confirmed / overridden |
| urgency_score | numeric | **AI field** 0–10 |
| urgency_score_source | text | |
| urgency_score_confidence | numeric | 0–1 |
| urgency_score_review_status | text | unreviewed / confirmed / overridden |
| resolution_notes | text | nullable |
| resolved_at | timestamptz | nullable |
| created_at | timestamptz | |

## audit_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| complaint_id | uuid FK | → complaints.id |
| action | text | created / status_change / ai_tagged / category_override |
| actor | text | agent / system |
| old_value | text | nullable |
| new_value | text | nullable |
| created_at | timestamptz | |

## RLS (v1)
All tables: permissive read + write for anonymous visitors. Replaced with `auth.uid() = user_id` in the Lock It Down sprint.
