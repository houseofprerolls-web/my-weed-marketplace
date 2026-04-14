-- Community feed / chat: public.posts + likes + comments + user_profiles for embeds.
-- Fixes PostgREST: "Could not find the table 'public.posts' in the schema cache"
-- when bolt/social migrations were never applied to this project.

-- ---------------------------------------------------------------------------
-- user_profiles (display for feed; id matches auth user / profiles.id)
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  username text not null,
  bio text,
  avatar_url text,
  cover_photo_url text,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  posts_count integer not null default 0,
  is_verified boolean not null default false,
  feed_shadowbanned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_username_unique unique (username)
);

create index if not exists idx_user_profiles_feed_shadowbanned
  on public.user_profiles (feed_shadowbanned);

-- If an older snapshot created user_profiles without this flag:
alter table public.user_profiles
  add column if not exists feed_shadowbanned boolean not null default false;

alter table public.user_profiles enable row level security;

drop policy if exists "Anyone can view user profiles" on public.user_profiles;
create policy "Anyone can view user profiles"
  on public.user_profiles for select
  to public
  using (true);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Backfill one row per profile so posts.user_id FK works.
insert into public.user_profiles (id, username)
select
  p.id,
  case
    when p.username is not null and length(trim(p.username)) > 0 then
      left(trim(p.username), 80) || '_' || substring(replace(p.id::text, '-', ''), 1, 8)
    else
      'member_' || substring(replace(p.id::text, '-', ''), 1, 12)
  end
from public.profiles p
where not exists (select 1 from public.user_profiles u where u.id = p.id)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  product_id uuid,
  service_id uuid,
  caption text,
  media_urls text[] not null default '{}'::text[],
  media_type text not null default 'image',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  is_featured boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts add column if not exists expires_at timestamptz;

update public.posts
set expires_at = coalesce(expires_at, created_at + interval '48 hours')
where expires_at is null;

alter table public.posts
  alter column expires_at set default (now() + interval '48 hours');

-- Optional FK to products when that table exists (vendors schema).
do $fk$
begin
  if to_regclass('public.products') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'posts_product_id_fkey'
    ) then
      alter table public.posts
        add constraint posts_product_id_fkey
        foreign key (product_id) references public.products (id) on delete set null;
    end if;
  end if;
end;
$fk$;

create index if not exists idx_posts_user_id on public.posts (user_id);
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_expires_at on public.posts (expires_at);

alter table public.posts enable row level security;

drop policy if exists "Anyone can view posts" on public.posts;
create policy "Anyone can view posts"
  on public.posts for select
  to public
  using (true);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-create user_profiles row on first post (FK requires it).
create or replace function public._ensure_user_profile_for_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, username)
  values (
    new.user_id,
    'member_' || substring(replace(new.user_id::text, '-', ''), 1, 12)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists tr_posts_ensure_user_profile on public.posts;
create trigger tr_posts_ensure_user_profile
  before insert on public.posts
  for each row
  execute function public._ensure_user_profile_for_post();

-- ---------------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------------
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Anyone can view post likes" on public.post_likes;
create policy "Anyone can view post likes"
  on public.post_likes for select
  to public
  using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike posts" on public.post_likes;
create policy "Users can unlike posts"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- post_comments
-- ---------------------------------------------------------------------------
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

drop policy if exists "Anyone can view comments" on public.post_comments;
create policy "Anyone can view comments"
  on public.post_comments for select
  to public
  using (true);

drop policy if exists "Users can create comments" on public.post_comments;
create policy "Users can create comments"
  on public.post_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments" on public.post_comments;
create policy "Users can update own comments"
  on public.post_comments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.post_comments;
create policy "Users can delete own comments"
  on public.post_comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ask PostgREST to refresh schema (self-hosted / some pools).
notify pgrst, 'reload schema';
