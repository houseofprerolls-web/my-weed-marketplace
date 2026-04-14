-- Admins opt vendors into Smokers Club; eligible shops can be placed in any regional ladder and appear in backfill sorted by shopper ZIP.

alter table public.vendors
  add column if not exists smokers_club_eligible boolean not null default false;

comment on column public.vendors.smokers_club_eligible is
  'When true, vendor may appear in Smokers Club (any market) and in admin placement pickers.';
