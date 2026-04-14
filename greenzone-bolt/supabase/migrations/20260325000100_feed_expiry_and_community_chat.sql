/*
  # Feed expiry + community chat foundation

  - Add 48-hour expiry to `posts`
  - Add triggers to maintain `posts.likes_count` and `posts.comments_count`
  - Create community chat tables (rooms, messages, attachments)
  - Add moderation/mute tables to enforce 24h mutes

  Notes:
  - We keep feed visibility TTL in the app/API via `expires_at`.
  - Hard-delete scheduling is handled separately (see cleanup todo).
*/

-- =====================================================
-- Feed: 48h expiry
-- =====================================================

alter table public.posts
  add column if not exists expires_at timestamptz;

-- Backfill + default for new rows (created_at defaults to now()).
update public.posts
set expires_at = coalesce(expires_at, created_at + interval '48 hours')
where expires_at is null;

alter table public.posts
  alter column expires_at set default (now() + interval '48 hours');

create index if not exists idx_posts_expires_at on public.posts(expires_at);

-- =====================================================
-- Feed: count maintenance (likes_count/comments_count)
-- =====================================================

create or replace function public._posts_recount_likes(p_post_id uuid)
returns void
language sql
security definer
as $$
  update public.posts
  set likes_count = (
    select count(*)::int
    from public.post_likes pl
    where pl.post_id = p_post_id
  )
  where id = p_post_id;
$$;

create or replace function public._posts_recount_comments(p_post_id uuid)
returns void
language sql
security definer
as $$
  update public.posts
  set comments_count = (
    select count(*)::int
    from public.post_comments pc
    where pc.post_id = p_post_id
  )
  where id = p_post_id;
$$;

create or replace function public._post_likes_after_change()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public._posts_recount_likes(coalesce(new.post_id, old.post_id));
  return null;
end;
$$;

create or replace function public._post_comments_after_change()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public._posts_recount_comments(coalesce(new.post_id, old.post_id));
  return null;
end;
$$;

drop trigger if exists trg_post_likes_recount on public.post_likes;
create trigger trg_post_likes_recount
after insert or delete on public.post_likes
for each row execute function public._post_likes_after_change();

drop trigger if exists trg_post_comments_recount on public.post_comments;
create trigger trg_post_comments_recount
after insert or delete on public.post_comments
for each row execute function public._post_comments_after_change();

-- =====================================================
-- Community chat tables
-- =====================================================

create table if not exists public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_messages_room_created
  on public.community_messages(room_id, created_at desc);

create table if not exists public.community_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.community_messages(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  public_url text not null,
  mime_type text,
  bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_attachments_message
  on public.community_message_attachments(message_id);

-- =====================================================
-- Moderation / mute
-- =====================================================

create table if not exists public.community_user_mutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_until timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_user_mutes_user_until
  on public.community_user_mutes(user_id, muted_until desc);

create unique index if not exists uq_community_user_mutes_user_active
  on public.community_user_mutes(user_id)
  where muted_until > now();

create table if not exists public.community_moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.community_rooms(id) on delete set null,
  message_id uuid references public.community_messages(id) on delete set null,
  event_type text not null, -- e.g. 'mute', 'flag', 'allow'
  rule text,               -- which rule matched
  severity int,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_moderation_events_created
  on public.community_moderation_events(created_at desc);

-- =====================================================
-- RLS
-- =====================================================

alter table public.community_rooms enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_message_attachments enable row level security;
alter table public.community_user_mutes enable row level security;
alter table public.community_moderation_events enable row level security;

-- Rooms: authenticated can read; admins can manage (kept simple for now).
drop policy if exists community_rooms_select on public.community_rooms;
create policy community_rooms_select
  on public.community_rooms for select
  to authenticated
  using (true);

-- Messages: authenticated can read; inserts blocked if user is muted.
drop policy if exists community_messages_select on public.community_messages;
create policy community_messages_select
  on public.community_messages for select
  to authenticated
  using (true);

drop policy if exists community_messages_insert on public.community_messages;
create policy community_messages_insert
  on public.community_messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1
      from public.community_user_mutes m
      where m.user_id = (select auth.uid())
        and m.muted_until > now()
    )
  );

drop policy if exists community_messages_delete_own on public.community_messages;
create policy community_messages_delete_own
  on public.community_messages for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Attachments: allow inserting attachments only for own message.
drop policy if exists community_attachments_select on public.community_message_attachments;
create policy community_attachments_select
  on public.community_message_attachments for select
  to authenticated
  using (true);

drop policy if exists community_attachments_insert on public.community_message_attachments;
create policy community_attachments_insert
  on public.community_message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.community_messages msg
      where msg.id = community_message_attachments.message_id
        and msg.user_id = (select auth.uid())
    )
  );

-- Mutes: user can read own mute; only admins can write via service role / admin tools.
drop policy if exists community_mutes_select_own on public.community_user_mutes;
create policy community_mutes_select_own
  on public.community_user_mutes for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Moderation events: only admins can read; keep locked down by default.
drop policy if exists community_moderation_events_admin_select on public.community_moderation_events;
create policy community_moderation_events_admin_select
  on public.community_moderation_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );

-- Seed default rooms
insert into public.community_rooms (slug, name, description)
values
  ('general', 'General', 'Friendly Treehouse community chat.'),
  ('strains', 'Strains', 'Talk strains, effects, and finds.'),
  ('help', 'Help', 'Get help using the Treehouse.')
on conflict (slug) do nothing;

