-- Approve Smokers Club CSV–seeded vendors in every listing_market (import only tagged one market per row).
-- Targets rows created by scripts/import-smokers-club-csv.mjs (note = 'smokers-club-csv-import').

insert into public.vendor_market_operations (vendor_id, market_id, approved, note)
select distinct s.vendor_id, lm.id, true, 'smokers-club-csv-all-markets'
from (
  select distinct vendor_id
  from public.vendor_market_operations
  where note = 'smokers-club-csv-import'
) s
cross join public.listing_markets lm
on conflict (vendor_id, market_id) do update
set approved = true;
