-- Run in Supabase SQL editor if approve-lead fails: column is_directory_listing does not exist.
-- (Same as supabase/migrations/0036_vendors_columns_for_lead_approval.sql)

alter table public.vendors
  add column if not exists is_directory_listing boolean not null default false;

alter table public.vendors
  add column if not exists offers_delivery boolean not null default true;

alter table public.vendors
  add column if not exists offers_storefront boolean not null default true;
