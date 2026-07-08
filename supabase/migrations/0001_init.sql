create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
drop policy if exists "categories_v1_read" on categories;
create policy "categories_v1_read" on categories for select using (true);
drop policy if exists "categories_v1_write" on categories;
create policy "categories_v1_write" on categories for all using (true) with check (true);

insert into categories (id, name, color) values
  ('a1000000-0000-0000-0000-000000000001', 'Billing', '#f59e0b'),
  ('a1000000-0000-0000-0000-000000000002', 'Technical', '#3b82f6'),
  ('a1000000-0000-0000-0000-000000000003', 'Service Quality', '#ef4444')
on conflict do nothing;

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  caller_name text not null,
  caller_phone text,
  channel text not null default 'phone',
  description text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  category_id uuid references categories(id),
  category_ai text,
  category_ai_source text,
  category_ai_confidence numeric,
  category_ai_review_status text default 'unreviewed',
  urgency_score numeric,
  urgency_score_source text,
  urgency_score_confidence numeric,
  urgency_score_review_status text default 'unreviewed',
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table complaints enable row level security;
drop policy if exists "complaints_v1_read" on complaints;
create policy "complaints_v1_read" on complaints for select using (true);
drop policy if exists "complaints_v1_write" on complaints;
create policy "complaints_v1_write" on complaints for all using (true) with check (true);

insert into complaints (id, caller_name, caller_phone, channel, description, status, priority, category_id, category_ai, category_ai_source, category_ai_confidence, category_ai_review_status, urgency_score, urgency_score_source, urgency_score_confidence, urgency_score_review_status) values
  ('b1000000-0000-0000-0000-000000000001', 'Maria Santos', '555-0101', 'phone', 'I was charged twice for my subscription this month and need an immediate refund.', 'open', 'high', 'a1000000-0000-0000-0000-000000000001', 'Billing', 'openai/gpt-4o', 0.97, 'confirmed', 9.1, 'openai/gpt-4o', 0.95, 'confirmed'),
  ('b1000000-0000-0000-0000-000000000002', 'James Okafor', '555-0102', 'chat', 'The app has been crashing every time I try to update my payment method for the last three days.', 'open', 'high', 'a1000000-0000-0000-0000-000000000002', 'Technical', 'openai/gpt-4o', 0.94, 'confirmed', 8.4, 'openai/gpt-4o', 0.91, 'confirmed'),
  ('b1000000-0000-0000-0000-000000000003', 'Linda Cho', '555-0103', 'email', 'The agent I spoke with last week was rude and did not resolve my issue at all.', 'in_progress', 'medium', 'a1000000-0000-0000-0000-000000000003', 'Service Quality', 'openai/gpt-4o', 0.89, 'confirmed', 6.2, 'openai/gpt-4o', 0.88, 'confirmed'),
  ('b1000000-0000-0000-0000-000000000004', 'Trevor Mills', '555-0104', 'phone', 'My internet has been down for 48 hours with no estimated repair time given.', 'open', 'high', 'a1000000-0000-0000-0000-000000000002', 'Technical', 'openai/gpt-4o', 0.96, 'confirmed', 9.5, 'openai/gpt-4o', 0.97, 'confirmed'),
  ('b1000000-0000-0000-0000-000000000005', 'Aisha Patel', '555-0105', 'chat', 'I was promised a discount three weeks ago but it has never appeared on my bill.', 'resolved', 'low', 'a1000000-0000-0000-0000-000000000001', 'Billing', 'openai/gpt-4o', 0.92, 'confirmed', 4.0, 'openai/gpt-4o', 0.90, 'confirmed')
on conflict do nothing;

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  complaint_id uuid references complaints(id),
  action text not null,
  actor text not null default 'agent',
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into audit_logs (complaint_id, action, actor, old_value, new_value) values
  ('b1000000-0000-0000-0000-000000000003', 'status_change', 'agent', 'open', 'in_progress'),
  ('b1000000-0000-0000-0000-000000000005', 'status_change', 'agent', 'in_progress', 'resolved')
on conflict do nothing;