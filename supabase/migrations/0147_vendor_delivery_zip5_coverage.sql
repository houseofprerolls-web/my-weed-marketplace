-- Optional per-ZIP5 service coverage: vendor may appear for a shopper ZIP when premise ZIP maps to a
-- different listing market (e.g. delivery into another metro). App gate: same listing_markets slug as
-- shopper ZIP from market_zip_prefixes rules, OR a row here.

create table if not exists public.vendor_delivery_zip5 (
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  zip text not null
    check (char_length(zip) = 5 and zip ~ '^[0-9]{5}$'),
  created_at timestamptz not null default now(),
  primary key (vendor_id, zip)
);

create index if not exists vendor_delivery_zip5_zip_idx
  on public.vendor_delivery_zip5 (zip);

comment on table public.vendor_delivery_zip5 is
  'Explicit ZIP5 where a vendor lists/serves; used with listing-market-from-ZIP alignment for shopper-area gates.';

alter table public.vendor_delivery_zip5 enable row level security;

drop policy if exists vendor_delivery_zip5_public_select on public.vendor_delivery_zip5;
create policy vendor_delivery_zip5_public_select
  on public.vendor_delivery_zip5 for select
  using (true);
