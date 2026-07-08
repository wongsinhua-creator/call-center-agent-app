# Security

## Secret Handling
- `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` live in Vercel environment variables only
- Never imported in any `app/` or `components/` file — only in `app/api/` server routes
- Public Supabase anon key is the only key allowed in frontend code

## Permission Model (v1 — demo)
- All tables open for read/write via permissive RLS policies
- No user identity enforced yet — safe only for public demo data

## Permission Model (lock-down sprint)
- `auth.uid() = user_id` RLS on all tables
- Agent can only read/write their own complaints
- AI agent (`system` actor) uses the server-side service role — never the client anon key

## Approved Tools Rule
- Only `openai_classify` is wired — no generic "run any prompt" endpoint
- API route validates input length and strips PII patterns before sending to OpenAI

## Audit Principle
- Every status change, AI tag, and category override writes to `audit_logs`
- Audit rows are insert-only — no update or delete policy on `audit_logs` in production
- If anything touches a complaint, there is a row proving it
