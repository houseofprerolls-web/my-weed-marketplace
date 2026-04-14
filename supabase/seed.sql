-- =============================================================================
-- DaTreehouse — development seed data
-- =============================================================================
-- Run after all migrations through 0019 (listing_markets, vendor_market_listings).
--
-- Safe to re-run: uses ON CONFLICT / DO NOTHING where constraints allow.
-- Some sections (e.g. products) may add duplicate rows on repeated runs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RLS off for bulk insert (re-enabled at end). IF EXISTS = seed won’t fail if a
-- migration wasn’t applied yet (table missing).
-- -----------------------------------------------------------------------------
alter table if exists public.vendors disable row level security;
alter table if exists public.vendor_locations disable row level security;
alter table if exists public.listing_markets disable row level security;
alter table if exists public.market_zip_prefixes disable row level security;
alter table if exists public.vendor_market_listings disable row level security;
alter table if exists public.effects disable row level security;
alter table if exists public.terpenes disable row level security;
alter table if exists public.strains disable row level security;
alter table if exists public.strain_effects disable row level security;
alter table if exists public.strain_terpenes disable row level security;
alter table if exists public.products disable row level security;
alter table if exists public.deals disable row level security;
alter table if exists public.orders disable row level security;
alter table if exists public.favorites disable row level security;
alter table if exists public.reviews disable row level security;

-- =============================================================================
-- 1. Reference: effects & terpenes
-- =============================================================================
insert into public.effects (name)
values
  ('Relaxed'),
  ('Happy'),
  ('Sleepy'),
  ('Focused'),
  ('Euphoric'),
  ('Uplifted'),
  ('Calm'),
  ('Pain Relief'),
  ('Energetic'),
  ('Creative')
on conflict (name) do nothing;

insert into public.terpenes (name)
values
  ('Limonene'),
  ('Myrcene'),
  ('Linalool'),
  ('Caryophyllene'),
  ('Pinene'),
  ('Terpinolene')
on conflict (name) do nothing;

-- =============================================================================
-- 2. Strains (+ join tables)
-- =============================================================================
insert into public.strains (
  name,
  slug,
  type,
  thc_min,
  thc_max,
  cbd_min,
  cbd_max,
  terpenes,
  effects,
  flavors,
  genetics,
  description,
  cannabis_guide_colors
)
values
  (
    'Northern Lights',
    'northern-lights',
    'indica',
    16,
    22,
    0.1,
    1.2,
    to_jsonb(ARRAY['Myrcene', 'Limonene']::text[]),
    ARRAY['Relaxed', 'Sleepy']::text[],
    ARRAY['Earthy', 'Sweet']::text[],
    'Afghani x Thai',
    'Earthy pine with deep relaxation.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  ),
  (
    'Blue Dream',
    'blue-dream',
    'hybrid',
    18,
    26,
    0.2,
    1.5,
    to_jsonb(ARRAY['Limonene', 'Myrcene', 'Pinene']::text[]),
    ARRAY['Happy', 'Focused', 'Relaxed']::text[],
    ARRAY['Berry', 'Sweet', 'Earthy']::text[],
    'Blueberry x Haze',
    'Balanced euphoria with a gentle lift.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  ),
  (
    'OG Kush',
    'og-kush',
    'indica',
    17,
    26,
    0.1,
    1.8,
    to_jsonb(ARRAY['Caryophyllene', 'Myrcene', 'Pinene']::text[]),
    ARRAY['Relaxed', 'Sleepy', 'Pain Relief']::text[],
    ARRAY['Pine', 'Earthy', 'Lemon']::text[],
    'Chem x Hindu Kush',
    'Classic pine-lemon fuel with heavy calm.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  ),
  (
    'Sour Diesel',
    'sour-diesel',
    'sativa',
    20,
    30,
    0.2,
    1.2,
    to_jsonb(ARRAY['Limonene', 'Terpinolene', 'Caryophyllene']::text[]),
    ARRAY['Energetic', 'Happy', 'Uplifted']::text[],
    ARRAY['Citrus', 'Diesel', 'Earthy']::text[],
    'Sour Diesel lineage',
    'Gassy citrus with an energetic head high.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  ),
  (
    'Gelato',
    'gelato',
    'hybrid',
    18,
    26,
    0.1,
    1.3,
    to_jsonb(ARRAY['Limonene', 'Caryophyllene', 'Myrcene']::text[]),
    ARRAY['Creative', 'Happy', 'Relaxed']::text[],
    ARRAY['Creamy', 'Citrus', 'Sweet']::text[],
    'Sunset Sherbet x Thin Mint GSC',
    'Creamy citrus candy with calm creativity.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  ),
  (
    'Wedding Cake',
    'wedding-cake',
    'hybrid',
    20,
    27,
    0.2,
    1.6,
    to_jsonb(ARRAY['Caryophyllene', 'Linalool', 'Myrcene']::text[]),
    ARRAY['Relaxed', 'Calm', 'Euphoric']::text[],
    ARRAY['Sweet', 'Vanilla', 'Earthy']::text[],
    'Triangle Kush x Animal Mints',
    'Sweet vanilla dessert with relaxing confidence.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  ),
  (
    'Zkittlez',
    'zkittlez',
    'hybrid',
    19,
    28,
    0.1,
    1.2,
    to_jsonb(ARRAY['Limonene', 'Caryophyllene', 'Terpinolene']::text[]),
    ARRAY['Happy', 'Euphoric', 'Relaxed']::text[],
    ARRAY['Fruit', 'Candy', 'Sweet']::text[],
    'Grape x Tutti Frutti',
    'Fruity candy flavor with mood-lifting effects.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  ),
  (
    'Jack Herer',
    'jack-herer',
    'sativa',
    16,
    24,
    0.2,
    1.5,
    to_jsonb(ARRAY['Pinene', 'Limonene', 'Terpinolene']::text[]),
    ARRAY['Focused', 'Energetic', 'Uplifted']::text[],
    ARRAY['Pine', 'Citrus', 'Earthy']::text[],
    'Haze x Northern Lights',
    'Clear-minded pine haze with lift.',
    jsonb_build_object('primary', '#0A3D2B', 'secondary', '#14532D')
  )
on conflict (slug) do nothing;

insert into public.strain_effects (strain_id, effect_id)
select s.id, e.id
from public.strains s
cross join lateral unnest(s.effects) as eff(effect_name)
join public.effects e on e.name = eff.effect_name
on conflict (strain_id, effect_id) do nothing;

insert into public.strain_terpenes (strain_id, terpene_id)
select s.id, t.id
from public.strains s
cross join lateral jsonb_array_elements_text(s.terpenes) as terp(terp_name)
join public.terpenes t on t.name = terp.terp_name
on conflict (strain_id, terpene_id) do nothing;

-- =============================================================================
-- 3. Vendors (two approved SF demo shops)
-- =============================================================================
insert into public.vendors (
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
  location,
  created_at
)
values
  (
    null,
    'House of Prerolls',
    null,
    'Premium cannabis with fast, friendly service.',
    'https://example.com/logo1.png',
    'https://example.com/banner1.png',
    'https://example.com/logo1.png',
    'HOPR',
    true,
    'approved',
    true,
    'basic',
    null,
    'house-of-pre-rolls',
    '123 Green St',
    'San Francisco',
    'CA',
    '94103',
    '415-555-0134',
    'https://example.com/hopr',
    ST_GeogFromText('POINT(-122.4194 37.7749)'),
    now()
  ),
  (
    null,
    'GP World',
    'Curated goods and friendly service.',
    'Second licensed partner storefront for development and demos.',
    'https://example.com/gp-world-logo.png',
    'https://example.com/gp-world-banner.png',
    'https://example.com/gp-world-logo.png',
    'GPW-001',
    true,
    'approved',
    true,
    'basic',
    null,
    'gp-world',
    '789 Mission St',
    'San Francisco',
    'CA',
    '94103',
    '415-555-0199',
    'https://example.com/gpworld',
    ST_GeogFromText('POINT(-122.4145 37.7599)'),
    now()
  )
on conflict (slug) do nothing;

-- =============================================================================
-- 4. Vendor locations (mirror vendor address / point)
-- =============================================================================
delete from public.vendor_locations
where vendor_id in (
  select id from public.vendors where slug in ('house-of-pre-rolls', 'gp-world')
);

insert into public.vendor_locations (vendor_id, address, city, state, zip, lat, lng, location, hours, services)
select
  v.id,
  v.address,
  v.city,
  v.state,
  v.zip,
  ST_Y(v.location::geometry),
  ST_X(v.location::geometry),
  v.location,
  case v.slug
    when 'house-of-pre-rolls' then jsonb_build_object('mon', '9am-7pm')
    when 'gp-world' then jsonb_build_object('mon', '10am-8pm')
    else jsonb_build_object('mon', '9am-7pm')
  end,
  case v.slug
    when 'house-of-pre-rolls' then array['pickup', 'delivery']::text[]
    when 'gp-world' then array['pickup', 'curbside']::text[]
    else array['pickup']::text[]
  end
from public.vendors v
where v.slug in ('house-of-pre-rolls', 'gp-world');

-- =============================================================================
-- 5. Products
-- =============================================================================
insert into public.products (
  vendor_id,
  strain_id,
  name,
  category,
  price_cents,
  inventory_count,
  potency_thc,
  potency_cbd,
  description,
  images,
  lab_results_url,
  in_stock,
  created_at
)
select
  v.id,
  s.id,
  s.name || ' Flower (7g)',
  'flower',
  4999,
  24,
  s.thc_min,
  s.cbd_max,
  'Sample product seeded for development.',
  array['https://example.com/p.png']::text[],
  null,
  true,
  now()
from public.vendors v
join public.strains s on true
where v.slug = 'house-of-pre-rolls';

insert into public.products (
  vendor_id,
  strain_id,
  name,
  category,
  price_cents,
  inventory_count,
  potency_thc,
  potency_cbd,
  description,
  images,
  lab_results_url,
  in_stock,
  created_at
)
select
  v.id,
  s.id,
  s.name || ' — GP World (3.5g)',
  'flower',
  4299,
  30,
  s.thc_min,
  s.cbd_max,
  'GP World menu sample.',
  array['https://example.com/gp.png']::text[],
  null,
  true,
  now()
from public.vendors v
cross join lateral (
  select id, name, thc_min, cbd_max
  from public.strains
  order by name
  limit 3
) s
where v.slug = 'gp-world';

-- =============================================================================
-- 6. Deal (House of Prerolls — up to 3 newest products)
-- =============================================================================
insert into public.deals (vendor_id, title, description, discount_percent, products, start_date, end_date)
select
  v.id,
  'Limited-Time Deal',
  'Curated bundle from our most popular inventory.',
  20,
  coalesce(
    (
      select array_agg(sub.id order by sub.created_at desc)
      from (
        select p.id, p.created_at
        from public.products p
        where p.vendor_id = v.id
        order by p.created_at desc
        limit 3
      ) sub
    ),
    '{}'::uuid[]
  ),
  (current_date - 1)::date,
  (current_date + 7)::date
from public.vendors v
where v.slug = 'house-of-pre-rolls';

-- =============================================================================
-- 7. Sample vendor review
-- =============================================================================
insert into public.reviews (
  reviewer_id,
  entity_type,
  entity_id,
  rating,
  title,
  body,
  photos,
  verified_purchase
)
select
  null,
  'vendor'::text,
  v.id,
  5,
  'Excellent!',
  'Smooth ordering and great recommendations.',
  array['https://example.com/review.png']::text[],
  false
from public.vendors v
where v.slug = 'house-of-pre-rolls'
limit 1;

-- =============================================================================
-- 8. Regional premium slots (Bay Area market — requires 0019)
-- =============================================================================
insert into public.vendor_market_listings (
  market_id,
  vendor_id,
  slot_rank,
  is_premium,
  active,
  note
)
select lm.id, v.id, s.slot_rank, true, true, s.note
from public.listing_markets lm
cross join (
  values
    ('house-of-pre-rolls', 0, 'Seed: House of Prerolls — slot 1'),
    ('gp-world', 1, 'Seed: GP World — slot 2')
) as s(vendor_slug, slot_rank, note)
join public.vendors v on v.slug = s.vendor_slug
where lm.slug = 'bay-area'
on conflict (market_id, vendor_id) do nothing;

-- =============================================================================
-- RLS back on
-- =============================================================================
alter table if exists public.vendors enable row level security;
alter table if exists public.vendor_locations enable row level security;
alter table if exists public.effects enable row level security;
alter table if exists public.terpenes enable row level security;
alter table if exists public.strains enable row level security;
alter table if exists public.strain_effects enable row level security;
alter table if exists public.strain_terpenes enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.deals enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.favorites enable row level security;
alter table if exists public.reviews enable row level security;
alter table if exists public.listing_markets enable row level security;
alter table if exists public.market_zip_prefixes enable row level security;
alter table if exists public.vendor_market_listings enable row level security;
