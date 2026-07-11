-- Agent handling: track which call-center agent is handling each complaint,
-- and record the acting agent's identity on every audit row.

alter table complaints add column if not exists handled_by text;
alter table audit_logs add column if not exists actor_name text;

-- Backfill seed data so the demo shows the feature.
update complaints set handled_by = 'Sam Rivera'
  where id = 'b1000000-0000-0000-0000-000000000003' and handled_by is null;
update complaints set handled_by = 'Priya Nair'
  where id = 'b1000000-0000-0000-0000-000000000005' and handled_by is null;
