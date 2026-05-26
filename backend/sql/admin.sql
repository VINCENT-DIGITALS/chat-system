-- System-admin extensions (separate from per-server chat roles)

alter table chat_users
  add column if not exists is_admin   boolean not null default false,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text;

-- Global key/value settings (maintenance mode, etc.)
create table if not exists chat_system_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references chat_users(id) on delete set null
);

insert into chat_system_settings (key, value)
values
  ('maintenance_mode',    'false'::jsonb),
  ('maintenance_message', '"The chat is temporarily down for maintenance."'::jsonb)
on conflict (key) do nothing;

-- Audit log for admin actions
create table if not exists chat_admin_audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references chat_users(id) on delete set null,
  action     text not null,
  target_type text,
  target_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_admin_audit_log_created_idx
  on chat_admin_audit_log(created_at desc);
