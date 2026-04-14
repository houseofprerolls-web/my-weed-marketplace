-- =============================================================================
-- 0210 — Coachella Valley listing market (split 922xx from Inland Empire)
-- =============================================================================
-- ZIP prefix 922 (Coachella Valley, Imperial border, Cathedral City, etc.) was
-- grouped with 923–925 (San Bernardino / western IE), causing Smokers Club and
-- premise gates to mix desert shops with Inland Empire shoppers.
--
-- Ops follow-up (admin dashboard):
--   • vendor_market_listings (Smokers Club / featured slots) for 922xx premises
--   • vendor_market_operations.approved rows if IE was used only because 922 shared IE
--   • Sponsored banners keyed to inland-empire vs new slug (see 0152 / 0197 patterns)
-- =============================================================================

insert into public.listing_markets (slug, name, subtitle, sort_order, region_key)
values (
  'coachella-valley',
  'Coachella Valley & desert 922',
  'Palm Springs, Cathedral City, Coachella, Imperial Valley 922 — separate from Inland Empire 923–925',
  65,
  'ca'
)
on conflict (slug) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  sort_order = excluded.sort_order,
  region_key = excluded.region_key;

update public.market_zip_prefixes mzp
set market_id = lm.id
from public.listing_markets lm
where mzp.prefix = '922'
  and lm.slug = 'coachella-valley';

comment on table public.market_zip_prefixes is
  'Maps USPS ZIP first 3 digits to a listing_markets row (multi-state: CA + NY). 922 → coachella-valley (since 0210).';
