-- Discord-style Chat System Schema
-- Tables are prefixed with chat_ to avoid colliding with the existing
-- portfolio-admin app that shares this Supabase project.

create extension if not exists "pgcrypto";

-- USERS
create table if not exists chat_users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  email         text unique not null,
  password_hash text not null,
  avatar_url    text,
  status        text not null default 'offline', -- online | offline | idle | dnd
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- SERVERS (guilds)
create table if not exists chat_servers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  icon_url      text,
  owner_id      uuid not null references chat_users(id) on delete cascade,
  invite_code   text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at    timestamptz not null default now()
);

-- SERVER MEMBERS
create table if not exists chat_server_members (
  id            uuid primary key default gen_random_uuid(),
  server_id     uuid not null references chat_servers(id) on delete cascade,
  user_id       uuid not null references chat_users(id) on delete cascade,
  role          text not null default 'member', -- owner | admin | member
  joined_at     timestamptz not null default now(),
  unique (server_id, user_id)
);

-- CHANNELS
create table if not exists chat_channels (
  id            uuid primary key default gen_random_uuid(),
  server_id     uuid not null references chat_servers(id) on delete cascade,
  name          text not null,
  type          text not null default 'text', -- text | voice | video
  position      int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists chat_channels_server_idx on chat_channels(server_id);

-- MESSAGES
create table if not exists chat_messages (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references chat_channels(id) on delete cascade,
  user_id       uuid not null references chat_users(id) on delete cascade,
  content       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists chat_messages_channel_idx on chat_messages(channel_id, created_at);

-- ATTACHMENTS (file uploads referenced from Supabase Storage)
create table if not exists chat_attachments (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references chat_messages(id) on delete cascade,
  file_url      text not null,
  file_name     text,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

-- VOICE/VIDEO ROOM PARTICIPANTS
create table if not exists chat_voice_room_participants (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references chat_channels(id) on delete cascade,
  user_id       uuid not null references chat_users(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  unique (channel_id, user_id)
);
