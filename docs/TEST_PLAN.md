# Test Plan

## v1 Success Scenario (manual walkthrough)
1. Open live URL → complaint list loads with seeded rows; status badges visible
2. Click "New Complaint" → form renders with all fields
3. Fill in: caller name, phone, select channel = "chat", type description > 50 chars
4. Submit → redirected to detail page; complaint appears with AI category + urgency score
5. Open `/dashboard` → open count incremented; new complaint appears in priority queue
6. On detail page: change status to "In Progress" → save → refresh page → status persists
7. Audit log at bottom of detail page shows: `created` + `status_change` entries

**Pass**: All 7 steps complete with no errors and correct data shown.

---

## Empty State Tests
- Delete all complaints from Supabase → list page shows "No complaints yet" empty state (not a blank screen)
- Open `/dashboard` with no data → counters show 0, queue shows empty message

## Error State Tests
- Disconnect Supabase URL in env → list page shows error banner, not a crash
- Submit form with empty required fields → inline validation errors appear; no DB call made
- Simulate OpenAI failure (bad API key) → complaint still saves; AI fields show `unreviewed` badge

## Edge Case Tests
- Submit complaint with description = 1 character → validation rejects it
- Rapidly click "Save Status" twice → second call is ignored or idempotent; no duplicate audit rows
- Open `/complaints/nonexistent-id` → 404 message shown, not a JS crash

## Persistence Check
- After every major action (create, status update, category override), do a hard refresh (Cmd+Shift+R)
- Data must be identical before and after — no localStorage-only state
