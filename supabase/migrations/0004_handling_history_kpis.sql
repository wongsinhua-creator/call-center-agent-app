-- Handling history + closure KPIs.
--
-- complaint_handlers records one row per handling "portion": each assignment
-- opens a segment (started_at) and each handoff / resolution closes it
-- (ended_at). This is what attributes each part of a complaint's life to a
-- named agent and makes time-based closure KPIs computable.

create table if not exists complaint_handlers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  complaint_id uuid not null references complaints(id),
  agent_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table complaint_handlers enable row level security;

drop policy if exists "handlers_owner_select" on complaint_handlers;
create policy "handlers_owner_select" on complaint_handlers for select using (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
drop policy if exists "handlers_owner_insert" on complaint_handlers;
create policy "handlers_owner_insert" on complaint_handlers for insert with check (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
drop policy if exists "handlers_owner_update" on complaint_handlers;
create policy "handlers_owner_update" on complaint_handlers for update using (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
) with check (
  (auth.uid() is null and user_id = 'd0000000-0000-0000-0000-000000000001')
  or auth.uid() = user_id
);
-- No delete policy: handling history is immutable, like audit_logs.

-- Seed resolved complaints predate resolved_at handling — backfill so
-- time-to-close KPIs have data.
update complaints set resolved_at = created_at + interval '2 days'
  where status = 'resolved' and resolved_at is null;

-- Backfill one segment per currently-assigned complaint: started when the
-- complaint was created, ended at resolution for resolved ones.
insert into complaint_handlers (user_id, complaint_id, agent_name, started_at, ended_at)
select user_id, id, handled_by, created_at,
       case when status = 'resolved' then resolved_at else null end
from complaints
where handled_by is not null
  and not exists (
    select 1 from complaint_handlers h where h.complaint_id = complaints.id
  );
