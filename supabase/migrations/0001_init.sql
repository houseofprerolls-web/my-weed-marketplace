-- Core schema for CannaHub.
-- NOTE: This project already has migrations 0002/0009/0013. This init migration
-- creates the underlying tables those migrations expect.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ----------------------------
-- Auth/Profile + Compliance
-- ----------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'consumer'
    check (role in ('consumer', 'vendor', 'admin')),
  full_name text,
  birthdate date,
  age_verified boolean not null default false,
  birthdate_confirmed_at timestamptz,

  avatar_url text,
  bio text,
  preferences jsonb not null default '{}'::jsonb,

  -- Geo-compliance (client geolocation + optional reverse geocode)
  geo_state text,
  geo_verified boolean not null default false,
  geo_verified_at timestamptz,
  geo_lat double precision,
  geo_lng double precision,

  created_at timestamptz not null default now()
);

-- ----------------------------
-- Strain encyclopedia
-- ----------------------------

create table if not exists public.effects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.terpenes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.strains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,

  type text not null
    check (type in ('indica', 'sativa', 'hybrid')),

  thc_min numeric,
  thc_max numeric,
  cbd_min numeric,
  cbd_max numeric,

  -- Used by the terpene wheel / profile.
  terpenes jsonb not null default '{}'::jsonb,
  effects text[] not null default '{}'::text[],
  flavors text[] not null default '{}'::text[],

  genetics text,
  description text,
  cannabis_guide_colors jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.strain_effects (
  strain_id uuid not null references public.strains(id) on delete cascade,
  effect_id uuid not null references public.effects(id) on delete cascade,
  primary key (strain_id, effect_id)
);

create table if not exists public.strain_terpenes (
  strain_id uuid not null references public.strains(id) on delete cascade,
  terpene_id uuid not null references public.terpenes(id) on delete cascade,
  primary key (strain_id, terpene_id)
);

-- ----------------------------
-- Vendors + Locations
-- ----------------------------

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,

  -- Required by existing view migration 0009.
  name text not null,
  tagline text,
  description text,
  logo_url text,
  banner_url text,
  map_marker_image_url text,

  -- Licensing / approval queue
  license_number text,
  verified boolean not null default false,
  license_status text not null default 'pending'
    check (license_status in ('pending', 'approved', 'rejected', 'needs_review')),
  is_live boolean not null default false,

  -- Subscription tier
  subscription_tier text not null default 'basic'
    check (subscription_tier in ('basic', 'pro', 'enterprise')),
  stripe_subscription_id text,

  slug text not null unique,

  -- Primary address fields (used by approved_vendors_coords view)
  address text,
  city text,
  state text,
  zip text,
  phone text,
  website text,

  location geography(Point, 4326),

  created_at timestamptz not null default now()
);

create table if not exists public.vendor_locations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,

  address text not null,
  city text,
  state text,
  zip text,

  lat double precision,
  lng double precision,
  location geography(Point, 4326),

  hours jsonb,
  services text[] not null default '{}'::text[],

  created_at timestamptz not null default now()
);

-- ----------------------------
-- Products + Deals + Orders + Community
-- ----------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  strain_id uuid references public.strains(id) on delete set null,

  name text not null,
  category text not null
    check (category in ('flower', 'edible', 'vape', 'concentrate', 'topical', 'preroll', 'other')),

  price_cents int not null check (price_cents >= 0),
  inventory_count int not null default 0,

  potency_thc numeric,
  potency_cbd numeric,

  description text,
  images text[] not null default '{}'::text[],
  lab_results_url text,

  in_stock boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,

  title text not null,
  description text,
  discount_percent int not null check (discount_percent >= 0 and discount_percent <= 100),

  -- Product ids included in this deal.
  products uuid[] not null default '{}'::uuid[],

  start_date date not null default current_date,
  end_date date not null default current_date,

  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references auth.users(id) on delete set null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,

  items jsonb not null default '[]'::jsonb,
  total_cents int not null check (total_cents >= 0),

  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),

  pickup_or_delivery text not null
    check (pickup_or_delivery in ('pickup', 'delivery', 'curbside')),

  scheduled_time timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('strain', 'product', 'vendor')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid references auth.users(id) on delete set null,

  entity_type text not null
    check (entity_type in ('strain', 'product', 'vendor')),
  entity_id uuid not null,

  rating int not null check (rating >= 1 and rating <= 5),
  title text not null,
  body text,
  photos text[] not null default '{}'::text[],
  verified_purchase boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------
-- Helpful indexes
-- ----------------------------

create index if not exists vendors_slug_idx on public.vendors(slug);
create index if not exists strains_slug_idx on public.strains(slug);
create index if not exists products_vendor_idx on public.products(vendor_id);
create index if not exists products_strain_idx on public.products(strain_id);
create index if not exists deals_vendor_idx on public.deals(vendor_id);
create index if not exists favorites_user_idx on public.favorites(user_id);
create index if not exists reviews_entity_idx on public.reviews(entity_type, entity_id);

-- ----------------------------
-- Row Level Security
-- ----------------------------

-- Strain encyclopedia policies come from migration 0002.
alter table public.effects enable row level security;
alter table public.terpenes enable row level security;
alter table public.strains enable row level security;
alter table public.strain_effects enable row level security;
alter table public.strain_terpenes enable row level security;

alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_locations enable row level security;
alter table public.products enable row level security;
alter table public.deals enable row level security;
alter table public.orders enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;

-- profiles: a user can view/update their own profile; admin writes handled via trigger/policies later.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- vendors: public can view only approved + live.
drop policy if exists vendors_public_select on public.vendors;
create policy vendors_public_select
  on public.vendors for select
  using (is_live = true and license_status = 'approved');

-- vendors: vendors can view their own vendor record (even if not live yet).
drop policy if exists vendors_vendor_select_own on public.vendors;
create policy vendors_vendor_select_own
  on public.vendors for select
  using (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  );

-- vendors: admin can view all.
drop policy if exists vendors_admin_select on public.vendors;
create policy vendors_admin_select
  on public.vendors for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- vendors: vendors can create/update/delete their own vendor.
drop policy if exists vendors_vendor_write on public.vendors;
create policy vendors_vendor_write
  on public.vendors for all
  using (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  );

-- vendors: admin can do anything.
drop policy if exists vendors_admin_all on public.vendors;
create policy vendors_admin_all
  on public.vendors for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- vendor_locations: public view only for approved + live vendors.
drop policy if exists vendor_locations_public_select on public.vendor_locations;
create policy vendor_locations_public_select
  on public.vendor_locations for select
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
  );

drop policy if exists vendor_locations_vendor_write on public.vendor_locations;
create policy vendor_locations_vendor_write
  on public.vendor_locations for all
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  )
  with check (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  );

drop policy if exists vendor_locations_admin_all on public.vendor_locations;
create policy vendor_locations_admin_all
  on public.vendor_locations for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- products: public view only if vendor is approved + live.
drop policy if exists products_public_select on public.products;
create policy products_public_select
  on public.products for select
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
  );

drop policy if exists products_vendor_write on public.products;
create policy products_vendor_write
  on public.products for all
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  )
  with check (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  );

drop policy if exists products_admin_all on public.products;
create policy products_admin_all
  on public.products for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- deals: public view only for active deals where vendor is approved + live.
drop policy if exists deals_public_select on public.deals;
create policy deals_public_select
  on public.deals for select
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
    and current_date >= start_date
    and current_date <= end_date
  );

drop policy if exists deals_vendor_write on public.deals;
create policy deals_vendor_write
  on public.deals for all
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  )
  with check (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vendor')
  );

drop policy if exists deals_admin_all on public.deals;
create policy deals_admin_all
  on public.deals for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- favorites: only the owner can read/write.
drop policy if exists favorites_own_select on public.favorites;
create policy favorites_own_select
  on public.favorites for select
  using (user_id = auth.uid());

drop policy if exists favorites_own_write on public.favorites;
create policy favorites_own_write
  on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- reviews: public can view reviews about public entities; users can create their own; admin can moderate.
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select
  on public.reviews for select
  using (
    (
      entity_type = 'strain'
      and exists (select 1 from public.strains s where s.id = entity_id)
    )
    or (
      entity_type = 'product'
      and exists (
        select 1
        from public.products p
        join public.vendors v on v.id = p.vendor_id
        where p.id = entity_id
          and v.is_live = true
          and v.license_status = 'approved'
      )
    )
    or (
      entity_type = 'vendor'
      and exists (
        select 1
        from public.vendors v
        where v.id = entity_id
          and v.is_live = true
          and v.license_status = 'approved'
      )
    )
  );

drop policy if exists reviews_reviewer_insert on public.reviews;
create policy reviews_reviewer_insert
  on public.reviews for insert
  with check (reviewer_id = auth.uid());

drop policy if exists reviews_reviewer_write on public.reviews;
create policy reviews_reviewer_write
  on public.reviews for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all
  on public.reviews for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- orders: consumers see their orders; vendors see orders for their vendor; admin sees all.
drop policy if exists orders_consumer_select on public.orders;
create policy orders_consumer_select
  on public.orders for select
  using (
    consumer_id = auth.uid()
    or exists (
      select 1
      from public.vendors v
      where v.id = orders.vendor_id
        and v.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists orders_consumer_insert on public.orders;
create policy orders_consumer_insert
  on public.orders for insert
  with check (consumer_id = auth.uid());

drop policy if exists orders_vendor_update on public.orders;
create policy orders_vendor_update
  on public.orders for update
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vendor','admin'))
  )
  with check (true);

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all
  on public.orders for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ----------------------------
-- Updated_at maintenance
-- ----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reviews_set_updated_at on public.reviews;
create trigger trg_reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

