-- =============================================================================
-- 0221 — ZIP prefix 917 → Inland Empire (vendor map pins + vendor_locations)
-- =============================================================================
-- USPS 917xx serves the Pomona Valley / western San Bernardino–Riverside corridor
-- (Ontario, Chino, Rancho Cucamonga, Upland, etc.). It was grouped with Greater LA
-- in 0019, so vendors with only "Inland Empire" enabled hit:
--   ZIP prefix 917 is not part of the selected market.
-- Re-map 917 to inland-empire so IE operating areas cover common IE storefront ZIPs.
-- (917 also includes some eastern LA County cities; admins can enable both markets
--  if a shop straddles how they merchandise GLA vs IE.)
-- =============================================================================

update public.market_zip_prefixes mzp
set market_id = lm.id
from public.listing_markets lm
where mzp.prefix = '917'
  and lm.slug = 'inland-empire';

comment on table public.market_zip_prefixes is
  'Maps USPS ZIP first 3 digits to a listing_markets row (multi-state: CA + NY). 922 → coachella-valley (0210). 917 → inland-empire (0221).';
