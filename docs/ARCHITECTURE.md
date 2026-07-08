# Architecture

## Stack
- **Frontend**: Next.js 14 (App Router) — Vercel deployment
- **Database**: Supabase (Postgres + RLS)
- **AI**: OpenAI GPT-4o via server-side Next.js API route
- **Styling**: Tailwind CSS

## Now vs Later
| Now (v1) | Later |
|---|---|
| Complaint CRUD + AI tagging | Agent auth + RLS owner policies |
| Dashboard with live counts | SLA timers, breach alerts |
| Status workflow | AI response drafts |
| Audit log writes | Trend reports, exports |

## Key Action Flow — Submit a Complaint
1. Agent fills form → POST to `/api/complaints`
2. API route calls OpenAI with the description → receives category + urgency score
3. Row inserted into `complaints` with AI fields (value, source, confidence, review_status)
4. Audit log row written: `action=created`
5. Client redirected to complaint detail page
6. Dashboard re-fetches counts from Supabase

## Layer Order
1. **Data first** — tables, constraints, RLS policies, seed data
2. **App logic** — form → API route → DB insert → status update
3. **Smart features** — AI tagging bolted on top; app works if AI call fails (defaults to `unreviewed`)

## AI-Off Guarantee
If the OpenAI call errors, the complaint is saved with `category_ai = null`, `urgency_score = null`, `review_status = 'unreviewed'`. The agent can set category manually. Core functionality never breaks.
