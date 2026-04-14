-- Unify all approved slideshow rows: Da Treehouse logo creative + Discover hub link (matches Smokers Club treehouse strip placement style).
-- Deploy `public/brand/datreehouse-logo.png` with the app.

update public.smokers_club_homepage_banners
set
  status = 'archived',
  updated_at = now()
where status = 'approved';

insert into public.smokers_club_homepage_banners (
  banner_kind,
  vendor_id,
  placement_key,
  image_url,
  link_url,
  slot_preset,
  status,
  admin_note
)
select
  'admin',
  null,
  v.placement_key,
  '/brand/datreehouse-logo.png',
  '/discover',
  'wide_banner',
  'approved',
  'Treehouse unified creative → Discover (migration 0151)'
from
  (
    values
      ('homepage_hero'::text),
      ('smokers_club_strip'),
      ('discover_top'),
      ('discover_mid'),
      ('deals'),
      ('dispensaries'),
      ('map'),
      ('feed')
  ) as v (placement_key);
