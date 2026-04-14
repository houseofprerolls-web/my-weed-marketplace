-- =============================================================================
-- 0019 — California listing markets + premium slots (replaces per-ZIP table)
-- =============================================================================
-- Prerequisites: public.vendors, public.profiles (admin role), and optionally
--   public.vendor_zip_placements from 0018 (migrated here, then dropped).
--
-- Shoppers: first 3 digits of ZIP → one regional "market"; admins assign up to
--   10 premium rows per market (slot_rank 0..9).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
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

create table if not exists public.vendor_market_listings (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.listing_markets (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  slot_rank int not null default 0
    check (slot_rank >= 0 and slot_rank <= 9),
  is_premium boolean not null default true,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (market_id, vendor_id)
);

create index if not exists vendor_market_listings_market_idx
  on public.vendor_market_listings (market_id);

comment on table public.vendor_market_listings is
  'Admin-managed premium ordering per market; public read, admin write.';

-- -----------------------------------------------------------------------------
-- Row level security
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
-- Seed markets (idempotent)
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

-- -----------------------------------------------------------------------------
-- ZIP prefix → market (each prefix appears exactly once)
-- -----------------------------------------------------------------------------
insert into public.market_zip_prefixes (prefix, market_id)
select m.prefix, lm.id
from public.listing_markets lm
join (
  values
    -- Greater Los Angeles (900–908, 910–918)
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
    -- Inland Empire (includes 909 San Bernardino area)
    ('909','inland-empire'),
    ('922','inland-empire'),
    ('923','inland-empire'),
    ('924','inland-empire'),
    ('925','inland-empire'),
    -- San Diego
    ('919','san-diego-county'),
    ('920','san-diego-county'),
    ('921','san-diego-county'),
    -- Orange County
    ('926','orange-county'),
    ('927','orange-county'),
    ('928','orange-county'),
    -- Central Coast
    ('930','central-coast'),
    ('931','central-coast'),
    ('934','central-coast'),
    ('939','central-coast'),
    -- Central Valley (no 954 — North Bay / Santa Rosa uses Bay Area)
    ('932','central-valley'),
    ('933','central-valley'),
    ('936','central-valley'),
    ('937','central-valley'),
    ('952','central-valley'),
    ('953','central-valley'),
    -- Desert / Imperial
    ('935','desert-imperial'),
    -- Bay Area (includes 954)
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
    -- South Bay
    ('950','south-bay'),
    ('951','south-bay'),
    -- Northern California
    ('955','northern-california'),
    ('960','northern-california'),
    -- Sacramento Valley
    ('956','sacramento-region'),
    ('957','sacramento-region'),
    ('958','sacramento-region'),
    ('959','sacramento-region'),
    -- Sierra
    ('961','mountains-sierra')
) as m(prefix, slug)
  on lm.slug = m.slug
on conflict (prefix) do nothing;

-- -----------------------------------------------------------------------------
-- Legacy: vendor_zip_placements → vendor_market_listings, then drop legacy table
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  m_id uuid;
  pref text;
begin
  if to_regclass('public.vendor_zip_placements') is null then
    return;
  end if;

  for r in
    select vzp.vendor_id, vzp.zip, vzp.slot_rank, vzp.note
    from public.vendor_zip_placements vzp
  loop
    pref := left(r.zip, 3);
    select m.market_id into m_id
    from public.market_zip_prefixes m
    where m.prefix = pref
    limit 1;

    if m_id is null then
      select id into m_id
      from public.listing_markets
      where slug = 'california-other'
      limit 1;
    end if;

    insert into public.vendor_market_listings (
      market_id, vendor_id, slot_rank, is_premium, active, note
    ) values (
      m_id,
      r.vendor_id,
      least(9, greatest(0, r.slot_rank)),
      true,
      true,
      coalesce(r.note, 'migrated from zip ' || r.zip)
    )
    on conflict (market_id, vendor_id) do update set
      slot_rank = excluded.slot_rank,
      note = excluded.note,
      is_premium = true,
      active = true;
  end loop;
end $$;

drop table if exists public.vendor_zip_placements;

-- -----------------------------------------------------------------------------
-- Admin RPC: reorder slots in one transaction
-- -----------------------------------------------------------------------------
create or replace function public.reorder_market_listings(
  p_market_id uuid,
  p_listing_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  if not exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role = 'admin'
  ) then
    raise exception 'admin only';
  end if;

  update public.vendor_market_listings lm
  set slot_rank = (o.ord::int - 1)
  from unnest(p_listing_ids) with ordinality as o(id, ord)
  where lm.id = o.id and lm.market_id = p_market_id;
end;
$$;

comment on function public.reorder_market_listings(uuid, uuid[]) is
  'Sets slot_rank 0..n-1 from array order; admin only.';

grant execute on function public.reorder_market_listings(uuid, uuid[]) to authenticated;
