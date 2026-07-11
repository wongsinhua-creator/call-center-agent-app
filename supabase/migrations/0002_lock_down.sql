-- Sprint 4: Lock It Down.
-- Replaces the permissive v1 policies with owner-scoped RLS.
--
-- Design: a fixed "demo pool" owner id keeps the public recruiter demo working
-- without auth. Anonymous visitors read/write ONLY demo-pool rows; authenticated
-- agents read/write ONLY their own rows (auth.uid() = user_id). No real auth
-- user exists for the demo id — it's just a constant.

-- ── Assign existing/seed rows to the demo pool ────────────────────────────────
update complaints set user_id = 'd0000000-0000-0000-0000-000000000001' where user_id is null;
update audit_logs set user_id = 'd0000000-0000-0000-0000-000000000001' where user_id is null;

-- ── complaints ────────────────────────────────────────────────────────────────
drop policy if exists "complaints_v1_read" on complaints;
drop policy if exists "complaints_v1_write" on complaints;
drop policy if exists "complaints_owner_select" on complaints;
drop policy if exists "complaints_owner_insert" on complaints;
drop policy if exists "complaints_owner_update" on complaints;

create policy "complaints_owner_select" on complaints for select using (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
create policy "complaints_owner_insert" on complaints for insert with check (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
create policy "complaints_owner_update" on complaints for update using (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
) with check (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
-- No delete policy: complaint deletion is human-only via the dashboard/service
-- role (docs/AGENTIC_LAYER.md "Critical").

-- ── audit_logs (insert-only per docs/SECURITY.md) ────────────────────────────
drop policy if exists "audit_logs_v1_read" on audit_logs;
drop policy if exists "audit_logs_v1_write" on audit_logs;
drop policy if exists "audit_logs_owner_select" on audit_logs;
drop policy if exists "audit_logs_owner_insert" on audit_logs;

create policy "audit_logs_owner_select" on audit_logs for select using (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
create policy "audit_logs_owner_insert" on audit_logs for insert with check (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
-- No update/delete policies: audit rows are immutable.

-- ── categories (shared read-only taxonomy) ───────────────────────────────────
drop policy if exists "categories_v1_read" on categories;
drop policy if exists "categories_v1_write" on categories;
drop policy if exists "categories_read_all" on categories;

create policy "categories_read_all" on categories for select using (true);
-- No write policies: only the service role can modify categories.
