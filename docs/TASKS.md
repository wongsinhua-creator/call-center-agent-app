# Tasks

## Sprint 1 — DB + Complaint Engine
**Goal**: Core complaint submit + list + detail works end-to-end against the database. App is live and demoable without login.

- [ ] Create Supabase project; run migration SQL (categories, complaints, audit_logs)
- [ ] Verify seed data appears in Supabase table editor
- [ ] Scaffold Next.js 14 app with Tailwind; connect Supabase client
- [ ] `/` route → complaint list page (loads from DB, not hardcoded)
- [ ] Complaint list: status badge, priority indicator, category chip, caller name, timestamp
- [ ] Loading skeleton, empty state ("No complaints yet"), error banner on fetch fail
- [ ] `/complaints/new` → submission form: caller name, phone, channel select, description textarea, category select
- [ ] Form submits to `/api/complaints` (POST) → inserts row → redirects to detail page
- [ ] `/complaints/[id]` → detail page: all fields, status dropdown, save button
- [ ] Status update (dropdown + save) → PATCH `/api/complaints/[id]` → updates DB + writes audit_log row
- [ ] Confirm every action reflects after hard refresh

**Definition of Done**: A new complaint submitted via the form appears in the list and detail page, and the status can be changed and persists after refresh. Seeded rows also visible.

---

## Sprint 2 — AI Tagging + Dashboard ⬅ v1 functional milestone
**Goal**: AI scores every new complaint; dashboard shows live counts.

- [ ] `/api/complaints` POST calls `openai_classify` with description; stores AI fields
- [ ] Graceful fallback: if OpenAI fails, complaint saves with `review_status = unreviewed`
- [ ] Confidence badge on complaint card and detail page
- [ ] Agent can override AI category via dropdown → updates `review_status = overridden` + writes audit_log
- [ ] `/dashboard` route: total open, counts per category, top-5 priority queue (sorted by urgency_score DESC)
- [ ] Dashboard loading skeleton, empty state, error state
- [ ] Audit log visible on complaint detail page (timeline of changes)

**Definition of Done**: Submit a complaint → AI category and score appear on the detail page. Dashboard counts update. All states handled.

---

## Sprint 3 — Polish + Portfolio Ready
**Goal**: Looks great, handles all edge cases, README ready for recruiters.

- [ ] Responsive layout (mobile + desktop)
- [ ] Resolution notes textarea on detail page; `resolved_at` timestamp set on resolve
- [ ] "Mark Resolved" button flow with confirmation
- [ ] Error boundaries on all pages
- [ ] Review all copy — clear labels, helpful placeholder text
- [ ] README with live URL, 2 screenshots, 30-second demo script, tech stack badges

**Definition of Done**: App looks portfolio-quality on mobile and desktop. README reads clearly to a non-technical recruiter.

---

## Sprint 4 — Lock It Down
**Goal**: Agent auth added; data isolated per user; safe to share publicly.

- [ ] Enable Supabase Auth; add login/signup page
- [ ] Replace v1 open RLS policies with `auth.uid() = user_id` owner policies
- [ ] Seed complaints assigned to a `demo@example.com` account for public showcase
- [ ] Protect `/api/` routes — verify session server-side
- [ ] Confirm no secrets in browser network tab
- [ ] Run through full TEST_PLAN.md after auth enabled

**Definition of Done**: Unauthenticated user sees demo account data only. An authenticated agent sees only their own complaints. No secrets exposed in client.

---

## Gantt
```
Week 1: [Sprint 1: DB + Engine] [Sprint 2: AI + Dashboard]
Week 2: [Sprint 3: Polish]     [Sprint 4: Lock It Down]
```
