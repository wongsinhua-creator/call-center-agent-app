# Agentic Layer

## Risk Levels & Actions

### Low — Auto-execute (no approval needed)
- `ai_tag_complaint` — classify category + score urgency from description
  - Tool: `openai_classify`; logged to audit_logs with source + confidence

### Medium — Agent confirms before executing (v1: not built yet)
- `suggest_response_draft` — generate a reply template for the agent to send
  - Shown as draft; agent edits and approves before use

### High — Always requires explicit approval
- `escalate_complaint` — flag for supervisor review and notify
  - Requires agent to click "Escalate" + confirm modal

### Critical — Human-only, never automated
- Issue refund
- Delete complaint record
- Any external communication sent on behalf of the company

## Named Tools (v1)
| Tool | Input | Output |
|---|---|---|
| `openai_classify` | complaint description (string) | category, urgency_score, confidence |

## Audit Log Fields
`action`, `actor`, `complaint_id`, `old_value`, `new_value`, `created_at`

Every AI action writes an audit row: `actor = system`, `action = ai_tagged`.

## v1 vs Later
- **v1**: only `ai_tag_complaint` runs automatically
- **Later**: response drafting (medium), escalation (high)
