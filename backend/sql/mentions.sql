-- @mention tracking for the Inbox/Mentions tab
create table if not exists chat_mentions (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references chat_messages(id) on delete cascade,
  mentioned_user uuid not null references chat_users(id) on delete cascade,
  channel_id    uuid not null references chat_channels(id) on delete cascade,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists chat_mentions_user_idx on chat_mentions(mentioned_user, created_at desc);
