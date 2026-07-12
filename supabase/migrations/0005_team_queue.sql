-- Team queue + saved views.
--
-- Access model change: the app now requires sign-in for everything, and every
-- authenticated user works the SAME shared complaint queue (view all, filter
-- by status / agent). Anonymous database access is removed entirely.
-- saved_filters stores each agent's personal saved views (owner-scoped).

-- ── complaints: authenticated team access ────────────────────────────────────
drop policy if exists "complaints_owner_select" on complaints;
drop policy if exists "complaints_owner_insert" on complaints;
drop policy if exists "complaints_owner_update" on complaints;
drop policy if exists "complaints_team_select" on complaints;
drop policy if exists "complaints_team_insert" on complaints;
drop policy if exists "complaints_team_update" on complaints;

create policy "complaints_team_select" on complaints for select using (auth.uid() is not null);
create policy "complaints_team_insert" on complaints for insert with check (auth.uid() is not null);
create policy "complaints_team_update" on complaints for update
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ── audit_logs: authenticated read + insert-only ─────────────────────────────
drop policy if exists "audit_logs_owner_select" on audit_logs;
drop policy if exists "audit_logs_owner_insert" on audit_logs;
drop policy if exists "audit_logs_team_select" on audit_logs;
drop policy if exists "audit_logs_team_insert" on audit_logs;

create policy "audit_logs_team_select" on audit_logs for select using (auth.uid() is not null);
create policy "audit_logs_team_insert" on audit_logs for insert with check (auth.uid() is not null);

-- ── complaint_handlers: authenticated team access ────────────────────────────
drop policy if exists "handlers_owner_select" on complaint_handlers;
drop policy if exists "handlers_owner_insert" on complaint_handlers;
drop policy if exists "handlers_owner_update" on complaint_handlers;
drop policy if exists "handlers_team_select" on complaint_handlers;
drop policy if exists "handlers_team_insert" on complaint_handlers;
drop policy if exists "handlers_team_update" on complaint_handlers;

create policy "handlers_team_select" on complaint_handlers for select using (auth.uid() is not null);
create policy "handlers_team_insert" on complaint_handlers for insert with check (auth.uid() is not null);
create policy "handlers_team_update" on complaint_handlers for update
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ── categories: authenticated read-only ──────────────────────────────────────
drop policy if exists "categories_read_all" on categories;
drop policy if exists "categories_team_select" on categories;
create policy "categories_team_select" on categories for select using (auth.uid() is not null);

-- ── saved_filters: each agent's personal saved views ─────────────────────────
create table if not exists saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  query text not null default '',
  created_at timestamptz not null default now()
);

alter table saved_filters enable row level security;

drop policy if exists "saved_filters_owner_select" on saved_filters;
drop policy if exists "saved_filters_owner_insert" on saved_filters;
drop policy if exists "saved_filters_owner_delete" on saved_filters;

create policy "saved_filters_owner_select" on saved_filters for select using (auth.uid() = user_id);
create policy "saved_filters_owner_insert" on saved_filters for insert with check (auth.uid() = user_id);
create policy "saved_filters_owner_delete" on saved_filters for delete using (auth.uid() = user_id);
