alter table public.vendor_market_listings
  drop constraint if exists vendor_market_listings_club_lane_check;

alter table public.vendor_market_listings
  add constraint vendor_market_listings_club_lane_check
  check (club_lane in ('delivery', 'storefront', 'treehouse'));
