-- Geo-scope sponsored slides by listing market (ZIP prefix → market via market_zip_prefixes / getMarketForSmokersClub).
-- NULL listing_market_id = fallback shown only when no rows exist for the shopper's resolved market.

alter table public.smokers_club_homepage_banners
  add column if not exists listing_market_id uuid references public.listing_markets (id) on delete set null;

comment on column public.smokers_club_homepage_banners.listing_market_id is
  'If set, slide shows only for shoppers whose ZIP resolves to this listing_markets row. If null, slide is a global fallback when the market has no matching rows.';

create index if not exists smokers_club_homepage_banners_status_placement_market_idx
  on public.smokers_club_homepage_banners (status, placement_key, listing_market_id);

drop index if exists smokers_club_homepage_banners_one_approved_per_vendor_placement;

-- Vendor: at most one approved row per (vendor, placement, market) when market is set.
create unique index if not exists smokers_club_homepage_banners_one_approved_vendor_placement_market
  on public.smokers_club_homepage_banners (vendor_id, placement_key, listing_market_id)
  where
    status = 'approved'
    and vendor_id is not null
    and listing_market_id is not null;

-- Vendor: at most one approved global row per (vendor, placement) when market is not scoped.
create unique index if not exists smokers_club_homepage_banners_one_approved_vendor_placement_global
  on public.smokers_club_homepage_banners (vendor_id, placement_key)
  where
    status = 'approved'
    and vendor_id is not null
    and listing_market_id is null;
