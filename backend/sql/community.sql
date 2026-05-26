-- Community-chat additions (reactions, replies, edits, pins, DMs, roles,
-- moderation, automod, webhooks, invites, channel categories, read state,
-- custom status, user theme settings).
--
-- Idempotent — safe to re-run.

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────
-- 1. MESSAGES: replies, edits, deletes, pins, forwards
-- ──────────────────────────────────────────────────────────────────────
alter table chat_messages
  add column if not exists parent_message_id uuid references chat_messages(id) on delete set null,
  add column if not exists edited_at         timestamptz,
  add column if not exists deleted_at        timestamptz,
  add column if not exists pinned            boolean not null default false,
  add column if not exists pinned_at         timestamptz,
  add column if not exists pinned_by         uuid references chat_users(id) on delete set null,
  add column if not exists forwarded_from    uuid references chat_messages(id) on delete set null;

create index if not exists chat_messages_parent_idx on chat_messages(parent_message_id);
create index if not exists chat_messages_pinned_idx on chat_messages(channel_id, pinned) where pinned;

-- Reactions
create table if not exists chat_message_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references chat_messages(id) on delete cascade,
  user_id     uuid not null references chat_users(id)    on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists chat_reactions_msg_idx on chat_message_reactions(message_id);

-- ──────────────────────────────────────────────────────────────────────
-- 2. CHANNELS: categories, expanded types, per-channel permissions
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_channel_categories (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references chat_servers(id) on delete cascade,
  name        text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists chat_categories_server_idx on chat_channel_categories(server_id, position);

alter table chat_channels
  add column if not exists category_id uuid references chat_channel_categories(id) on delete set null,
  add column if not exists topic        text,
  add column if not exists nsfw         boolean not null default false,
  add column if not exists slowmode_sec int    not null default 0,
  add column if not exists is_private   boolean not null default false;

-- Channel type now supports: text | voice | video | announcement | forum | stage
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name='chat_channels' and column_name='type') then
    -- no enum migration needed; type stays text and validated in app layer
    null;
  end if;
end $$;

-- (Per-channel permission overrides are created later, after chat_roles
--  exists, since they reference chat_roles.id.)

-- ──────────────────────────────────────────────────────────────────────
-- 3. ROLES: structured role hierarchy + permission bitmask
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_roles (
  id           uuid primary key default gen_random_uuid(),
  server_id    uuid not null references chat_servers(id) on delete cascade,
  name         text not null,
  color        text,                 -- "#aabbcc"
  position     int  not null default 0,
  permissions  bigint not null default 0,
  hoist        boolean not null default false,
  mentionable  boolean not null default false,
  managed      boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (server_id, name)
);
create index if not exists chat_roles_server_idx on chat_roles(server_id, position);

create table if not exists chat_member_roles (
  server_id  uuid not null references chat_servers(id) on delete cascade,
  user_id    uuid not null references chat_users(id)   on delete cascade,
  role_id    uuid not null references chat_roles(id)   on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (server_id, user_id, role_id)
);
create index if not exists chat_member_roles_user_idx on chat_member_roles(user_id);

-- Per-server profile overrides (nickname, server-specific avatar)
alter table chat_server_members
  add column if not exists nickname            text,
  add column if not exists server_avatar_url   text;

-- Per-channel permission overrides — created here so the FK to chat_roles
-- can be declared inline.
create table if not exists chat_channel_permissions (
  id           uuid primary key default gen_random_uuid(),
  channel_id   uuid not null references chat_channels(id) on delete cascade,
  role_id      uuid references chat_roles(id) on delete cascade,
  user_id      uuid references chat_users(id) on delete cascade,
  allow_bits   bigint not null default 0,
  deny_bits    bigint not null default 0,
  check (
    (role_id is not null and user_id is null) or
    (role_id is null and user_id is not null)
  )
);
create index if not exists chat_channel_perms_channel_idx on chat_channel_permissions(channel_id);

-- ──────────────────────────────────────────────────────────────────────
-- 4. INVITES: temp/permanent/custom-code links separate from server.invite_code
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_invites (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references chat_servers(id) on delete cascade,
  channel_id  uuid references chat_channels(id) on delete set null,
  code        text not null unique,
  created_by  uuid not null references chat_users(id) on delete cascade,
  uses        int  not null default 0,
  max_uses    int,
  expires_at  timestamptz,
  is_temporary boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists chat_invites_server_idx on chat_invites(server_id);

-- ──────────────────────────────────────────────────────────────────────
-- 5. DIRECT MESSAGES (1:1 + group DMs)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_dm_conversations (
  id          uuid primary key default gen_random_uuid(),
  is_group    boolean not null default false,
  name        text,                       -- group name (null for 1:1)
  icon_url    text,
  owner_id    uuid references chat_users(id) on delete set null, -- group owner
  created_at  timestamptz not null default now(),
  last_message_at timestamptz default now()
);

create table if not exists chat_dm_members (
  conversation_id uuid not null references chat_dm_conversations(id) on delete cascade,
  user_id         uuid not null references chat_users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  muted           boolean not null default false,
  primary key (conversation_id, user_id)
);
create index if not exists chat_dm_members_user_idx on chat_dm_members(user_id);

create table if not exists chat_dm_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_dm_conversations(id) on delete cascade,
  user_id         uuid not null references chat_users(id) on delete cascade,
  content         text not null default '',
  parent_message_id uuid references chat_dm_messages(id) on delete set null,
  type            text not null default 'message',
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists chat_dm_messages_conv_idx on chat_dm_messages(conversation_id, created_at);

create table if not exists chat_dm_attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references chat_dm_messages(id) on delete cascade,
  file_url    text not null,
  file_name   text,
  mime_type   text,
  size_bytes  bigint,
  created_at  timestamptz not null default now()
);

create table if not exists chat_dm_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references chat_dm_messages(id) on delete cascade,
  user_id     uuid not null references chat_users(id)       on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

-- ──────────────────────────────────────────────────────────────────────
-- 6. MODERATION (kick/ban/timeout) + audit log per-server
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_member_moderation (
  id            uuid primary key default gen_random_uuid(),
  server_id     uuid not null references chat_servers(id) on delete cascade,
  user_id       uuid not null references chat_users(id)   on delete cascade,
  actor_id      uuid references chat_users(id) on delete set null,
  action        text not null,         -- 'kick' | 'ban' | 'timeout' | 'unban' | 'untimeout'
  reason        text,
  expires_at    timestamptz,           -- for timeout / temp ban
  created_at    timestamptz not null default now()
);
create index if not exists chat_mod_server_idx on chat_member_moderation(server_id, created_at desc);
create index if not exists chat_mod_user_idx   on chat_member_moderation(user_id, server_id);

create table if not exists chat_server_audit_log (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references chat_servers(id) on delete cascade,
  actor_id    uuid references chat_users(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists chat_server_audit_idx on chat_server_audit_log(server_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────────
-- 7. AUTOMOD (basic keyword + spam rules)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_automod_rules (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references chat_servers(id) on delete cascade,
  name        text not null,
  rule_type   text not null,               -- 'keyword' | 'spam' | 'mention_spam' | 'caps'
  config      jsonb not null default '{}', -- {keywords:["..."], threshold:5, ...}
  action      text not null default 'block', -- 'block' | 'flag' | 'timeout'
  enabled     boolean not null default true,
  created_by  uuid references chat_users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_automod_server_idx on chat_automod_rules(server_id);

-- ──────────────────────────────────────────────────────────────────────
-- 8. WEBHOOKS (incoming, per-channel)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_webhooks (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references chat_servers(id) on delete cascade,
  channel_id  uuid not null references chat_channels(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  token       text not null unique default encode(gen_random_bytes(20), 'hex'),
  created_by  uuid references chat_users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_webhooks_channel_idx on chat_webhooks(channel_id);

-- ──────────────────────────────────────────────────────────────────────
-- 9. READ STATES + unread indicators
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_read_states (
  user_id            uuid not null references chat_users(id) on delete cascade,
  channel_id         uuid references chat_channels(id) on delete cascade,
  dm_conversation_id uuid references chat_dm_conversations(id) on delete cascade,
  last_read_at       timestamptz not null default now(),
  mention_count      int not null default 0,
  check (channel_id is not null or dm_conversation_id is not null),
  unique (user_id, channel_id, dm_conversation_id)
);
create index if not exists chat_read_states_user_idx on chat_read_states(user_id);

-- ──────────────────────────────────────────────────────────────────────
-- 10. USER PROFILE: custom status, presence states, activity sharing
-- ──────────────────────────────────────────────────────────────────────
alter table chat_users
  add column if not exists custom_status        text,
  add column if not exists custom_status_emoji  text,
  add column if not exists custom_status_until  timestamptz,
  add column if not exists banner_url           text,
  add column if not exists activity_share       boolean not null default true,
  add column if not exists badges               jsonb   not null default '[]'::jsonb,
  add column if not exists profile_effect       text,    -- original effect ID, no Discord asset
  add column if not exists nameplate            text;    -- original nameplate ID

-- Allowed presence values stay app-level: online | idle | dnd | invisible | offline

-- ──────────────────────────────────────────────────────────────────────
-- 11. USER SETTINGS + THEME SETTINGS (server-side mirror, optional)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_user_settings (
  user_id            uuid primary key references chat_users(id) on delete cascade,
  locale             text not null default 'en',
  timezone           text,
  notifications      jsonb not null default '{}'::jsonb,
  privacy            jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);

create table if not exists chat_theme_settings (
  user_id      uuid primary key references chat_users(id) on delete cascade,
  mode         text not null default 'dark',     -- light | soft-gray | dark | near-black | system | custom
  density      text not null default 'default',  -- compact | default | spacious
  msg_mode     text not null default 'default',  -- compact | default
  custom_base  text not null default 'dark',     -- light | dark
  brand_color  text,
  gradient     jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- 12. VOICE STATES (already partially exists; extend)
-- ──────────────────────────────────────────────────────────────────────
alter table chat_voice_room_participants
  add column if not exists muted        boolean not null default false,
  add column if not exists deafened     boolean not null default false,
  add column if not exists self_muted   boolean not null default false,
  add column if not exists self_video   boolean not null default false,
  add column if not exists streaming    boolean not null default false,
  add column if not exists is_speaker   boolean not null default false; -- stage channels

-- ──────────────────────────────────────────────────────────────────────
-- 13. SERVER COMMUNITY FEATURES (verification, rules, welcome, onboarding)
-- ──────────────────────────────────────────────────────────────────────
alter table chat_servers
  add column if not exists description       text,
  add column if not exists banner_url        text,
  add column if not exists verification_level text not null default 'none',
       -- none | low | medium | high | very_high
  add column if not exists rules             text,
  add column if not exists welcome_message   text,
  add column if not exists system_channel_id uuid references chat_channels(id) on delete set null,
  add column if not exists rules_channel_id  uuid references chat_channels(id) on delete set null,
  add column if not exists is_community      boolean not null default false;

-- ──────────────────────────────────────────────────────────────────────
-- 14. THREAD MEMBERS (subscribers for notifications)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists chat_thread_members (
  thread_id   uuid not null references chat_threads(id) on delete cascade,
  user_id     uuid not null references chat_users(id)   on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- (chat_channel_permissions.role_id FK to chat_roles is now defined inline
--  in the table create above, so no extra deferred step is needed.)
