-- Threads, polls, system messages, role permissions

-- Message type (text | system_join | system_leave | poll)
alter table chat_messages
  add column if not exists type text not null default 'message',
  add column if not exists thread_id uuid;

-- Threads anchored to a parent (root) message in a channel
create table if not exists chat_threads (
  id                uuid primary key default gen_random_uuid(),
  channel_id        uuid not null references chat_channels(id) on delete cascade,
  root_message_id   uuid references chat_messages(id) on delete set null,
  name              text not null,
  created_by        uuid not null references chat_users(id) on delete cascade,
  created_at        timestamptz not null default now()
);
create index if not exists chat_threads_channel_idx on chat_threads(channel_id);

-- Add FK now that the table exists
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chat_messages_thread_fk') then
    alter table chat_messages
      add constraint chat_messages_thread_fk
      foreign key (thread_id) references chat_threads(id) on delete cascade;
  end if;
end $$;

create index if not exists chat_messages_thread_idx on chat_messages(thread_id);

-- Polls
create table if not exists chat_polls (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references chat_messages(id) on delete cascade,
  question     text not null,
  options      jsonb not null,                -- [{idx:0, text:"Yes"}, {idx:1, text:"No"}]
  multi_select boolean not null default false,
  closes_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists chat_polls_message_idx on chat_polls(message_id);

create table if not exists chat_poll_votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references chat_polls(id) on delete cascade,
  user_id     uuid not null references chat_users(id) on delete cascade,
  option_idx  int not null,
  created_at  timestamptz not null default now(),
  unique (poll_id, user_id, option_idx)
);
create index if not exists chat_poll_votes_poll_idx on chat_poll_votes(poll_id);
