-- Self-contained: profiles + vendors + vendor_hours + business_licenses + RLS
-- for admin vendor console (NEXT_PUBLIC_USE_VENDORS_TABLE=1).
--
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS / idempotent alters.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- 1) public.profiles (required by RLS policies below)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'consumer',
  full_name text,
  birthdate date,
  age_verified boolean not null default false,
  birthdate_confirmed_at timestamptz,
  avatar_url text,
  bio text,
  preferences jsonb not null default '{}'::jsonb,
  geo_state text,
  geo_verified boolean not null default false,
  geo_verified_at timestamptz,
  geo_lat double precision,
  geo_lng double precision,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists zip_code text;
alter table public.profiles add column if not exists id_verified boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('consumer', 'customer', 'vendor', 'admin'));

alter table public.profiles enable row level security;

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

-- ---------------------------------------------------------------------------
-- 2) public.vendors
-- ---------------------------------------------------------------------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,

  name text not null,
  tagline text,
  description text,
  logo_url text,
  banner_url text,
  map_marker_image_url text,

  license_number text,
  verified boolean not null default false,
  license_status text not null default 'pending'
    check (license_status in ('pending', 'approved', 'rejected', 'needs_review')),
  is_live boolean not null default false,

  subscription_tier text not null default 'basic'
    check (subscription_tier in ('basic', 'pro', 'enterprise')),
  stripe_subscription_id text,

  slug text not null unique,

  address text,
  city text,
  state text,
  zip text,
  phone text,
  website text,

  location geography(Point, 4326),

  created_at timestamptz not null default now()
);

create index if not exists vendors_slug_idx on public.vendors(slug);

-- ---------------------------------------------------------------------------
-- 3) vendor_hours + business_licenses
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_hours (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (vendor_id, day_of_week)
);

create table if not exists public.business_licenses (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  license_number text not null,
  license_type text not null,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  document_url text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_hours_vendor_id on public.vendor_hours(vendor_id);
create index if not exists idx_business_licenses_vendor_id on public.business_licenses(vendor_id);

alter table public.vendor_hours enable row level security;
alter table public.business_licenses enable row level security;

drop policy if exists vendor_hours_admin_all on public.vendor_hours;
create policy vendor_hours_admin_all
  on public.vendor_hours for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists vendor_hours_owner_all on public.vendor_hours;
create policy vendor_hours_owner_all
  on public.vendor_hours for all
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

drop policy if exists vendor_hours_public_select on public.vendor_hours;
create policy vendor_hours_public_select
  on public.vendor_hours for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
  );

drop policy if exists business_licenses_admin_all on public.business_licenses;
create policy business_licenses_admin_all
  on public.business_licenses for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists business_licenses_owner_select on public.business_licenses;
create policy business_licenses_owner_select
  on public.business_licenses for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

drop policy if exists business_licenses_owner_write on public.business_licenses;
create policy business_licenses_owner_write
  on public.business_licenses for insert
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

drop policy if exists business_licenses_owner_update on public.business_licenses;
create policy business_licenses_owner_update
  on public.business_licenses for update
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

drop policy if exists business_licenses_owner_delete on public.business_licenses;
create policy business_licenses_owner_delete
  on public.business_licenses for delete
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );
