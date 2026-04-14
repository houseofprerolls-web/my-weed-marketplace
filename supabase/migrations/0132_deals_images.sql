-- Allow vendors to visually promote deals.

alter table public.deals
  add column if not exists image_url text;

