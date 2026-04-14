-- =============================================================================
-- 0024 — Smokers Club lanes + slot ranks 1–10
-- =============================================================================
-- Safe if you never ran 0019: creates listing_markets, market_zip_prefixes,
-- and vendor_market_listings. If 0019 already ran, upgrades the listings table.
-- Requires: public.vendors, public.profiles (for RLS admin checks).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Parents (same as 0019; idempotent)
-- -----------------------------------------------------------------------------
create table if not exists public.listing_markets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  sort_order int not null default 0
);

comment on table public.listing_markets is
  'Broad CA regions for homepage premium ordering (not city-level).';

create table if not exists public.market_zip_prefixes (
  prefix text not null
    check (char_length(prefix) = 3 and prefix ~ '^[0-9]{3}$'),
  market_id uuid not null references public.listing_markets (id) on delete cascade,
  primary key (prefix)
);

create index if not exists market_zip_prefixes_market_idx
  on public.market_zip_prefixes (market_id);

comment on table public.market_zip_prefixes is
  'Maps USPS ZIP first 3 digits to a listing_markets row (CA-focused).';

-- -----------------------------------------------------------------------------
-- vendor_market_listings: create when missing (final shape)
-- -----------------------------------------------------------------------------
create table if not exists public.vendor_market_listings (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.listing_markets (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  slot_rank int not null default 1,
  club_lane text not null default 'delivery',
  is_premium boolean not null default true,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  constraint vendor_market_listings_slot_rank_check check (slot_rank >= 1 and slot_rank <= 10),
  constraint vendor_market_listings_club_lane_check check (club_lane in ('delivery', 'storefront')),
  constraint vendor_market_listings_market_vendor_lane_key unique (market_id, vendor_id, club_lane)
);

create index if not exists vendor_market_listings_market_idx
  on public.vendor_market_listings (market_id);

create index if not exists vendor_market_listings_market_lane_idx
  on public.vendor_market_listings (market_id, club_lane);

comment on table public.vendor_market_listings is
  'Admin-managed Smokers Club placements per market and lane; public read, admin write.';

comment on column public.vendor_market_listings.club_lane is
  'Smokers Club lane: delivery (offers_delivery) vs storefront (pickup / no delivery).';

-- -----------------------------------------------------------------------------
-- RLS (idempotent)
-- -----------------------------------------------------------------------------
alter table public.listing_markets enable row level security;
alter table public.market_zip_prefixes enable row level security;
alter table public.vendor_market_listings enable row level security;

drop policy if exists listing_markets_public_select on public.listing_markets;
create policy listing_markets_public_select
  on public.listing_markets for select using (true);

drop policy if exists listing_markets_admin_all on public.listing_markets;
create policy listing_markets_admin_all
  on public.listing_markets for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists market_zip_prefixes_public_select on public.market_zip_prefixes;
create policy market_zip_prefixes_public_select
  on public.market_zip_prefixes for select using (true);

drop policy if exists market_zip_prefixes_admin_all on public.market_zip_prefixes;
create policy market_zip_prefixes_admin_all
  on public.market_zip_prefixes for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists vendor_market_listings_public_select on public.vendor_market_listings;
create policy vendor_market_listings_public_select
  on public.vendor_market_listings for select using (true);

drop policy if exists vendor_market_listings_admin_all on public.vendor_market_listings;
create policy vendor_market_listings_admin_all
  on public.vendor_market_listings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- Seed markets + ZIP prefixes (idempotent; same as 0019)
-- -----------------------------------------------------------------------------
insert into public.listing_markets (slug, name, subtitle, sort_order) values
  ('bay-area', 'San Francisco Bay Area', 'Alameda, SF, Marin, East Bay, North Bay', 10),
  ('south-bay', 'South Bay & Peninsula', 'Santa Clara & lower peninsula', 20),
  ('sacramento-region', 'Sacramento Valley', 'Sacramento metro & nearby', 30),
  ('central-valley', 'Central Valley', 'Fresno, Stockton, Modesto corridor', 40),
  ('greater-los-angeles', 'Greater Los Angeles', 'LA County core urban', 50),
  ('orange-county', 'Orange County', 'Coastal OC & Santa Ana corridor', 60),
  ('inland-empire', 'Inland Empire', 'Riverside, San Bernardino, eastern IE', 70),
  ('san-diego-county', 'San Diego County', 'San Diego metro', 80),
  ('central-coast', 'Central Coast', 'Monterey through Santa Barbara', 90),
  ('northern-california', 'Northern California', 'North Coast & Redding area', 100),
  ('mountains-sierra', 'Sierra & mountains', 'Tahoe corridor & mountain towns', 110),
  ('desert-imperial', 'Desert & Imperial', 'Palm Springs, Imperial Valley', 120),
  ('california-other', 'California — other', 'ZIP prefix not mapped above', 999)
on conflict (slug) do nothing;

insert into public.market_zip_prefixes (prefix, market_id)
select m.prefix, lm.id
from public.listing_markets lm
join (
  values
    ('900','greater-los-angeles'),
    ('901','greater-los-angeles'),
    ('902','greater-los-angeles'),
    ('903','greater-los-angeles'),
    ('904','greater-los-angeles'),
    ('905','greater-los-angeles'),
    ('906','greater-los-angeles'),
    ('907','greater-los-angeles'),
    ('908','greater-los-angeles'),
    ('910','greater-los-angeles'),
    ('911','greater-los-angeles'),
    ('912','greater-los-angeles'),
    ('913','greater-los-angeles'),
    ('914','greater-los-angeles'),
    ('915','greater-los-angeles'),
    ('916','greater-los-angeles'),
    ('917','greater-los-angeles'),
    ('918','greater-los-angeles'),
    ('909','inland-empire'),
    ('922','inland-empire'),
    ('923','inland-empire'),
    ('924','inland-empire'),
    ('925','inland-empire'),
    ('919','san-diego-county'),
    ('920','san-diego-county'),
    ('921','san-diego-county'),
    ('926','orange-county'),
    ('927','orange-county'),
    ('928','orange-county'),
    ('930','central-coast'),
    ('931','central-coast'),
    ('934','central-coast'),
    ('939','central-coast'),
    ('932','central-valley'),
    ('933','central-valley'),
    ('936','central-valley'),
    ('937','central-valley'),
    ('952','central-valley'),
    ('953','central-valley'),
    ('935','desert-imperial'),
    ('940','bay-area'),
    ('941','bay-area'),
    ('942','bay-area'),
    ('943','bay-area'),
    ('944','bay-area'),
    ('945','bay-area'),
    ('946','bay-area'),
    ('947','bay-area'),
    ('948','bay-area'),
    ('949','bay-area'),
    ('954','bay-area'),
    ('950','south-bay'),
    ('951','south-bay'),
    ('955','northern-california'),
    ('960','northern-california'),
    ('956','sacramento-region'),
    ('957','sacramento-region'),
    ('958','sacramento-region'),
    ('959','sacramento-region'),
    ('961','mountains-sierra')
) as m(prefix, slug)
  on lm.slug = m.slug
on conflict (prefix) do nothing;

-- -----------------------------------------------------------------------------
-- Upgrade path: table already existed from 0019 (0–9 slots, no club_lane, old unique)
-- -----------------------------------------------------------------------------
alter table public.vendor_market_listings
  add column if not exists club_lane text;

update public.vendor_market_listings
set club_lane = 'delivery'
where club_lane is null or club_lane = '';

alter table public.vendor_market_listings
  alter column club_lane set default 'delivery';

alter table public.vendor_market_listings
  alter column club_lane set not null;

alter table public.vendor_market_listings
  drop constraint if exists vendor_market_listings_club_lane_check;

alter table public.vendor_market_listings
  add constraint vendor_market_listings_club_lane_check
  check (club_lane in ('delivery', 'storefront'));

-- Legacy slot_rank 0 → 10 (was “slot 0” in old 0–9 scheme)
update public.vendor_market_listings set slot_rank = 10 where slot_rank = 0;

alter table public.vendor_market_listings
  drop constraint if exists vendor_market_listings_slot_rank_check;

alter table public.vendor_market_listings
  add constraint vendor_market_listings_slot_rank_check
  check (slot_rank >= 1 and slot_rank <= 10);

alter table public.vendor_market_listings
  alter column slot_rank set default 1;

alter table public.vendor_market_listings
  drop constraint if exists vendor_market_listings_market_id_vendor_id_key;

alter table public.vendor_market_listings
  drop constraint if exists vendor_market_listings_market_vendor_lane_key;

alter table public.vendor_market_listings
  add constraint vendor_market_listings_market_vendor_lane_key
  unique (market_id, vendor_id, club_lane);
