-- Ad slideshow placements: same table, filter by placement_key (Weedmaps-style inventory).
alter table public.smokers_club_homepage_banners
  add column if not exists placement_key text not null default 'homepage_hero';

comment on column public.smokers_club_homepage_banners.placement_key is
  'Where this slide runs: homepage_hero, smokers_club_strip, discover_top, discover_mid, deals, dispensaries, map, feed, etc.';

create index if not exists smokers_club_homepage_banners_status_placement_idx
  on public.smokers_club_homepage_banners (status, placement_key);

-- One approved vendor creative per placement (same shop can run different art in different slots).
drop index if exists smokers_club_homepage_banners_one_approved_per_vendor;

create unique index if not exists smokers_club_homepage_banners_one_approved_per_vendor_placement
  on public.smokers_club_homepage_banners (vendor_id, placement_key)
  where status = 'approved' and vendor_id is not null;
