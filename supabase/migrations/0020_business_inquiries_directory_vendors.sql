-- Business submissions + directory-only vendors + product profit tracking.
-- Rule: is_live requires either a linked owner (user_id) OR admin-managed directory listing.

-- ---------------------------------------------------------------------------
-- vendors: directory flag (admin-only listings without auth owner)
-- ---------------------------------------------------------------------------
alter table public.vendors
  add column if not exists is_directory_listing boolean not null default false;

comment on column public.vendors.is_directory_listing is
  'When true, shop has no user_id; only admins create these. Owned live shops must have user_id.';

-- Existing rows with no owner (e.g. seed data) become directory listings.
update public.vendors
set is_directory_listing = true
where user_id is null;

-- Live storefronts: must have owner OR be explicit directory entry.
alter table public.vendors
  drop constraint if exists vendors_live_requires_owner_or_directory;

alter table public.vendors
  add constraint vendors_live_requires_owner_or_directory
  check (
    (not is_live)
    or is_directory_listing
    or (user_id is not null)
  );

-- Directory rows must not claim an owner.
alter table public.vendors
  drop constraint if exists vendors_directory_no_user;

alter table public.vendors
  add constraint vendors_directory_no_user
  check (
    (not is_directory_listing) or (user_id is null)
  );

-- ---------------------------------------------------------------------------
-- products: optional internal profit tracking (cents)
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists profit_cents int not null default 0;

alter table public.products
  drop constraint if exists products_profit_cents_nonneg;

alter table public.products
  add constraint products_profit_cents_nonneg check (profit_cents >= 0);

comment on column public.products.profit_cents is
  'Vendor-recorded profit for this SKU (e.g. per unit); not shown to shoppers.';

-- ---------------------------------------------------------------------------
-- business_inquiries: public submit, admin read/update
-- ---------------------------------------------------------------------------
create table if not exists public.business_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dispensary_name text not null,
  license_information text not null,
  phone text not null,
  email text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'contacted', 'archived')),
  admin_notes text
);

alter table public.business_inquiries enable row level security;

drop policy if exists business_inquiries_insert_public on public.business_inquiries;
create policy business_inquiries_insert_public
  on public.business_inquiries for insert
  to anon, authenticated
  with check (true);

drop policy if exists business_inquiries_admin_select on public.business_inquiries;
create policy business_inquiries_admin_select
  on public.business_inquiries for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists business_inquiries_admin_update on public.business_inquiries;
create policy business_inquiries_admin_update
  on public.business_inquiries for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists business_inquiries_admin_delete on public.business_inquiries;
create policy business_inquiries_admin_delete
  on public.business_inquiries for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
