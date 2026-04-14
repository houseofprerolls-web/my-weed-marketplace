-- Smokers Club tree + legacy checks use `vendor_market_operations.approved` per `listing_markets` row.
-- App code also treats `smokers_club_eligible` + live + approved license as passing the shopper market gate
-- (see `lib/vendorShopperArea.ts`) so directory listing / ladder rows are not required for alignment.
-- This migration still bulk-approves eligible vendors in every market for admin UIs and any code paths that only read vmo.

insert into public.vendor_market_operations (vendor_id, market_id, approved, note)
select v.id, lm.id, true, 'smokers-club-eligible-all-markets'
from public.vendors v
cross join public.listing_markets lm
where v.is_live = true
  and v.license_status = 'approved'
  and coalesce(v.smokers_club_eligible, false) = true
on conflict (vendor_id, market_id) do update
set approved = true;
