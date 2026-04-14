-- Site-wide ban flag (enforced in app after profile load + Auth ban_duration).

alter table public.profiles
  add column if not exists site_banned boolean not null default false;

alter table public.profiles
  add column if not exists site_banned_at timestamptz;

create index if not exists idx_profiles_site_banned
  on public.profiles (site_banned)
  where site_banned = true;

comment on column public.profiles.site_banned is
  'When true, client signs user out and login is blocked via Auth ban_duration (set by admin API).';
