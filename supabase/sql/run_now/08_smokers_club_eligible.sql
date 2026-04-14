-- Run in Supabase → SQL Editor if you see: column vendors.smokers_club_eligible does not exist
-- Safe to run multiple times (IF NOT EXISTS).

alter table public.vendors
  add column if not exists smokers_club_eligible boolean not null default false;

comment on column public.vendors.smokers_club_eligible is
  'When true, vendor may appear in Smokers Club (any market) and in admin placement pickers.';
