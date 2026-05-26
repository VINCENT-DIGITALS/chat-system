-- Server scheduled events

create table if not exists chat_events (
  id                uuid primary key default gen_random_uuid(),
  server_id         uuid not null references chat_servers(id) on delete cascade,
  channel_id        uuid references chat_channels(id) on delete set null,
  external_location text,
  created_by        uuid not null references chat_users(id) on delete cascade,
  topic             text not null,
  description       text,
  cover_url         text,
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  frequency         text not null default 'does_not_repeat',
  status            text not null default 'scheduled',
  created_at        timestamptz not null default now()
);
create index if not exists chat_events_server_idx on chat_events(server_id, starts_at);

create table if not exists chat_event_interested (
  event_id   uuid not null references chat_events(id) on delete cascade,
  user_id    uuid not null references chat_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
