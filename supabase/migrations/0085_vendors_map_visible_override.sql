-- Map markers should default to Smokers Club only.
-- Admin can explicitly unhide a shop marker via this override.

alter table public.vendors
  add column if not exists map_visible_override boolean not null default false;

