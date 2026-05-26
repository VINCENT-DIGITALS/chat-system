-- Profile + bot + branding additions

alter table chat_users
  add column if not exists display_name text,
  add column if not exists bio          text,
  add column if not exists pronouns     text,
  add column if not exists is_bot       boolean not null default false,
  add column if not exists banner_color text;

-- Optional length constraint for bio (Discord: ~190 chars)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chat_users_bio_len'
  ) then
    alter table chat_users add constraint chat_users_bio_len
      check (bio is null or char_length(bio) <= 190);
  end if;
end $$;

-- App branding (settable from the admin panel)
insert into chat_system_settings (key, value)
values
  ('app_name',  '"Chat System"'::jsonb),
  ('app_short', '"CS"'::jsonb)
on conflict (key) do nothing;
