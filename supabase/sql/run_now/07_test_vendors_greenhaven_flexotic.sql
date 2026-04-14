-- Test vendors: GreenHaven + Flexotic
--
-- What this does:
-- 1) For auth users that already exist with the emails below,
--    it sets `public.profiles.role = 'vendor'`.
-- 2) It upserts rows into `public.vendors` so the admin UI can manage them.
--
-- Prereq:
-- Create two auth users in Supabase first (Authentication → Users) with:
--   greenhaven.vendor@greenzone.test (password: pokemon3)
--   flexotic.vendor@greenzone.test  (password: pokemon3)
--
-- Then run this SQL once.

-- GreenHaven
INSERT INTO public.profiles (id, role, full_name)
SELECT
  u.id,
  'vendor'::text,
  'GreenHaven'::text
FROM auth.users u
WHERE lower(trim(u.email)) = lower(trim('greenhaven.vendor@greenzone.test'))
ON CONFLICT (id) DO UPDATE
SET role = 'vendor',
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

INSERT INTO public.vendors (
  user_id,
  name,
  tagline,
  description,
  logo_url,
  banner_url,
  map_marker_image_url,
  license_number,
  verified,
  license_status,
  is_live,
  subscription_tier,
  stripe_subscription_id,
  slug,
  address,
  city,
  state,
  zip,
  phone,
  website,
  location
)
SELECT
  u.id,
  'GreenHaven',
  'Clean picks. Fast service.',
  'A test dispensary for admin UI verification.',
  'https://example.com/greenhaven-logo.png',
  'https://example.com/greenhaven-banner.png',
  'https://example.com/greenhaven-map-marker.png',
  'GH-TEST-001',
  true,
  'approved',
  true,
  'basic',
  NULL,
  'greenhaven',
  '101 Green Haven Ave',
  'Los Angeles',
  'CA',
  '90001',
  '(555) 0101',
  'https://greenhaven.example',
  ST_MakePoint(-118.2437, 34.0522)::geography
FROM auth.users u
WHERE lower(trim(u.email)) = lower(trim('greenhaven.vendor@greenzone.test'))
ON CONFLICT (slug) DO UPDATE
SET
  user_id = excluded.user_id,
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  logo_url = excluded.logo_url,
  banner_url = excluded.banner_url,
  map_marker_image_url = excluded.map_marker_image_url,
  license_number = excluded.license_number,
  verified = excluded.verified,
  license_status = excluded.license_status,
  is_live = excluded.is_live,
  subscription_tier = excluded.subscription_tier,
  stripe_subscription_id = excluded.stripe_subscription_id,
  address = excluded.address,
  city = excluded.city,
  state = excluded.state,
  zip = excluded.zip,
  phone = excluded.phone,
  website = excluded.website,
  location = excluded.location;

-- Flexotic
INSERT INTO public.profiles (id, role, full_name)
SELECT
  u.id,
  'vendor'::text,
  'Flexotic'::text
FROM auth.users u
WHERE lower(trim(u.email)) = lower(trim('flexotic.vendor@greenzone.test'))
ON CONFLICT (id) DO UPDATE
SET role = 'vendor',
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

INSERT INTO public.vendors (
  user_id,
  name,
  tagline,
  description,
  logo_url,
  banner_url,
  map_marker_image_url,
  license_number,
  verified,
  license_status,
  is_live,
  subscription_tier,
  stripe_subscription_id,
  slug,
  address,
  city,
  state,
  zip,
  phone,
  website,
  location
)
SELECT
  u.id,
  'Flexotic',
  'Quality strains. Flexible deals.',
  'A test dispensary for admin UI verification.',
  'https://example.com/flexotic-logo.png',
  'https://example.com/flexotic-banner.png',
  'https://example.com/flexotic-map-marker.png',
  'FX-TEST-002',
  true,
  'approved',
  true,
  'basic',
  NULL,
  'flexotic',
  '202 Flexotic Blvd',
  'San Francisco',
  'CA',
  '94103',
  '(555) 0202',
  'https://flexotic.example',
  ST_MakePoint(-122.4194, 37.7749)::geography
FROM auth.users u
WHERE lower(trim(u.email)) = lower(trim('flexotic.vendor@greenzone.test'))
ON CONFLICT (slug) DO UPDATE
SET
  user_id = excluded.user_id,
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  logo_url = excluded.logo_url,
  banner_url = excluded.banner_url,
  map_marker_image_url = excluded.map_marker_image_url,
  license_number = excluded.license_number,
  verified = excluded.verified,
  license_status = excluded.license_status,
  is_live = excluded.is_live,
  subscription_tier = excluded.subscription_tier,
  stripe_subscription_id = excluded.stripe_subscription_id,
  address = excluded.address,
  city = excluded.city,
  state = excluded.state,
  zip = excluded.zip,
  phone = excluded.phone,
  website = excluded.website,
  location = excluded.location;

