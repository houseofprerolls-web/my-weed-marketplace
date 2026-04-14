-- =============================================================================
-- 0212 — Clone active global marketing slides into every listing_market
-- Shoppers resolve a market from ZIP; pick logic prefers market-specific rows.
-- Globals (listing_market_id null) remain as fallback when a market has no slides.
-- Optional: archive globals manually if you want admin-only per-market decks and
-- no global fallback (re-seed new markets if you do).
-- =============================================================================

insert into public.marketing_banner_slides (
  placement_key,
  title,
  image_url,
  link_url,
  sort_order,
  listing_market_id,
  vendor_id,
  admin_note,
  status,
  creative_format
)
select
  s.placement_key,
  s.title,
  s.image_url,
  s.link_url,
  s.sort_order,
  lm.id,
  s.vendor_id,
  s.admin_note,
  s.status,
  coalesce(s.creative_format, 'leaderboard')
from public.marketing_banner_slides s
cross join public.listing_markets lm
where s.status = 'active'
  and s.listing_market_id is null
  and not exists (
    select 1
    from public.marketing_banner_slides x
    where x.status = 'active'
      and x.placement_key = s.placement_key
      and x.listing_market_id = lm.id
      and x.sort_order = s.sort_order
      and x.image_url is not distinct from s.image_url
      and x.vendor_id is not distinct from s.vendor_id
  );
