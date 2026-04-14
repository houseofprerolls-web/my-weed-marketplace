-- Demo dispensary owned by master admin (must match greenzone-bolt/lib/admin.ts MASTER_ADMIN_EMAIL).
-- After run: sign in as that user → Vendor Dashboard + /listing/[id] for this slug.
-- Prereq: migrations 0024 (listing_markets), 0025 (smokers_club_eligible), 0026 (vendor_market_operations), 0023 (offers_delivery).

insert into public.vendors (
  user_id,
  name,
  tagline,
  description,
  license_number,
  verified,
  license_status,
  is_live,
  slug,
  city,
  state,
  zip,
  phone,
  website,
  smokers_club_eligible,
  offers_delivery
)
select
  u.id,
  'House of Prerolls (Admin demo)',
  'Master account shop',
  'Use this listing to test vendor flows while signed in as the master admin.',
  'ADMIN-DEMO-HOP',
  true,
  'approved',
  true,
  'house-of-prerolls-admin-demo',
  'Los Angeles',
  'CA',
  '90012',
  '(555) 010-4200',
  'https://example.com',
  true,
  true
from auth.users u
where lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'))
on conflict (slug) do update set
  user_id = excluded.user_id,
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  license_status = excluded.license_status,
  is_live = excluded.is_live,
  zip = excluded.zip,
  smokers_club_eligible = excluded.smokers_club_eligible,
  offers_delivery = excluded.offers_delivery;

-- Approve Greater LA + optional second market so Smokers Club / placements work immediately
insert into public.vendor_market_operations (vendor_id, market_id, approved)
select v.id, lm.id, true
from public.vendors v
cross join public.listing_markets lm
where v.slug = 'house-of-prerolls-admin-demo'
  and lm.slug in ('greater-los-angeles', 'orange-county')
on conflict (vendor_id, market_id) do update set approved = excluded.approved;
