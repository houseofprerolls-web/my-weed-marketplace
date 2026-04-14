/*
  # Feed shadowban controls

  - Adds `feed_shadowbanned` to user_profiles
  - Allows admin tooling to flag users so their feed comments are only visible to themselves + admins
*/

alter table public.user_profiles
  add column if not exists feed_shadowbanned boolean not null default false;

create index if not exists idx_user_profiles_feed_shadowbanned
  on public.user_profiles(feed_shadowbanned);

