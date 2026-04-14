-- B2B supply exchange (RFQ v1): supply accounts, listings, promos, RFQs.
-- Buyers: vendor owners / team (vendor_staff_may_manage). Sellers: supply_account_members.

-- ---------------------------------------------------------------------------
-- supply_accounts
-- ---------------------------------------------------------------------------

create table if not exists public.supply_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  account_type text not null
    check (account_type in ('brand', 'distributor')),
  brand_id uuid references public.brands (id) on delete set null,
  contact_email text,
  contact_phone text,
  notes_admin text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supply_accounts_slug_unique unique (slug)
);

create index if not exists supply_accounts_brand_id_idx on public.supply_accounts (brand_id);
create index if not exists supply_accounts_published_idx on public.supply_accounts (is_published) where is_published = true;

-- ---------------------------------------------------------------------------
-- supply_account_members
-- ---------------------------------------------------------------------------

create table if not exists public.supply_account_members (
  id uuid primary key default gen_random_uuid(),
  supply_account_id uuid not null references public.supply_accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor'
    check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  constraint supply_account_members_account_user unique (supply_account_id, user_id)
);

create index if not exists supply_account_members_user_idx on public.supply_account_members (user_id);
create index if not exists supply_account_members_account_idx on public.supply_account_members (supply_account_id);

-- ---------------------------------------------------------------------------
-- Helpers (after supply_account_members: LANGUAGE sql body is validated at CREATE)
-- ---------------------------------------------------------------------------

create or replace function public.supply_account_staff_may_manage(p_supply_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.supply_account_members m
      where m.supply_account_id = p_supply_account_id
        and m.user_id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.supply_account_staff_may_manage(uuid) from public;
grant execute on function public.supply_account_staff_may_manage(uuid) to authenticated;

comment on function public.supply_account_staff_may_manage(uuid) is
  'True when auth user is a member of the supply account (row_security=off).';

-- ---------------------------------------------------------------------------
-- b2b_listings
-- ---------------------------------------------------------------------------

create table if not exists public.b2b_listings (
  id uuid primary key default gen_random_uuid(),
  supply_account_id uuid not null references public.supply_accounts (id) on delete cascade,
  catalog_product_id uuid references public.catalog_products (id) on delete set null,
  title_override text,
  description text,
  category text not null default 'other'
    check (category in ('flower', 'edible', 'vape', 'concentrate', 'topical', 'preroll', 'other')),
  moq integer,
  case_size text,
  list_price_cents integer,
  visibility text not null default 'draft'
    check (visibility in ('draft', 'live')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint b2b_listings_catalog_or_title check (
    catalog_product_id is not null
    or (title_override is not null and length(trim(title_override)) > 0)
  )
);

create index if not exists b2b_listings_supply_account_idx on public.b2b_listings (supply_account_id);
create index if not exists b2b_listings_catalog_product_idx on public.b2b_listings (catalog_product_id);
create index if not exists b2b_listings_visibility_idx on public.b2b_listings (visibility);

-- ---------------------------------------------------------------------------
-- b2b_listing_promos
-- ---------------------------------------------------------------------------

create table if not exists public.b2b_listing_promos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.b2b_listings (id) on delete cascade,
  headline text not null,
  discount_percent numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_listing_promos_listing_idx on public.b2b_listing_promos (listing_id);

-- ---------------------------------------------------------------------------
-- b2b_rfq_requests
-- ---------------------------------------------------------------------------

create table if not exists public.b2b_rfq_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_vendor_id uuid not null references public.vendors (id) on delete cascade,
  supplier_supply_account_id uuid not null references public.supply_accounts (id) on delete cascade,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'quoted', 'closed', 'cancelled')),
  buyer_note text,
  supplier_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_rfq_requests_buyer_idx on public.b2b_rfq_requests (buyer_vendor_id);
create index if not exists b2b_rfq_requests_supplier_idx on public.b2b_rfq_requests (supplier_supply_account_id);
create index if not exists b2b_rfq_requests_status_idx on public.b2b_rfq_requests (status);

-- ---------------------------------------------------------------------------
-- b2b_rfq_line_items
-- ---------------------------------------------------------------------------

create table if not exists public.b2b_rfq_line_items (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.b2b_rfq_requests (id) on delete cascade,
  listing_id uuid references public.b2b_listings (id) on delete set null,
  title_snapshot text not null,
  qty numeric not null default 1 check (qty > 0),
  unit text not null default 'case',
  target_price_cents integer,
  created_at timestamptz not null default now()
);

create index if not exists b2b_rfq_line_items_rfq_idx on public.b2b_rfq_line_items (rfq_id);

create or replace function public.b2b_rfq_line_items_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.listing_id is null then
      raise exception 'b2b_rfq_line_items.listing_id required';
    end if;
    if not exists (
      select 1
      from public.b2b_rfq_requests r
      join public.b2b_listings l on l.id = new.listing_id
      where r.id = new.rfq_id
        and l.supply_account_id = r.supplier_supply_account_id
        and l.visibility = 'live'
    ) then
      raise exception 'listing does not belong to RFQ supplier or is not live';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists b2b_rfq_line_items_validate_trg on public.b2b_rfq_line_items;
create trigger b2b_rfq_line_items_validate_trg
  before insert or update on public.b2b_rfq_line_items
  for each row
  execute function public.b2b_rfq_line_items_validate();

-- ---------------------------------------------------------------------------
-- updated_at touch
-- ---------------------------------------------------------------------------

create or replace function public.touch_supply_accounts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists supply_accounts_touch_updated on public.supply_accounts;
create trigger supply_accounts_touch_updated
  before update on public.supply_accounts
  for each row execute function public.touch_supply_accounts_updated_at();

create or replace function public.touch_b2b_listings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists b2b_listings_touch_updated on public.b2b_listings;
create trigger b2b_listings_touch_updated
  before update on public.b2b_listings
  for each row execute function public.touch_b2b_listings_updated_at();

create or replace function public.touch_b2b_listing_promos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists b2b_listing_promos_touch_updated on public.b2b_listing_promos;
create trigger b2b_listing_promos_touch_updated
  before update on public.b2b_listing_promos
  for each row execute function public.touch_b2b_listing_promos_updated_at();

create or replace function public.touch_b2b_rfq_requests_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists b2b_rfq_requests_touch_updated on public.b2b_rfq_requests;
create trigger b2b_rfq_requests_touch_updated
  before update on public.b2b_rfq_requests
  for each row execute function public.touch_b2b_rfq_requests_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.supply_accounts enable row level security;
alter table public.supply_account_members enable row level security;
alter table public.b2b_listings enable row level security;
alter table public.b2b_listing_promos enable row level security;
alter table public.b2b_rfq_requests enable row level security;
alter table public.b2b_rfq_line_items enable row level security;

-- supply_accounts: browse published; members see theirs; admin all
drop policy if exists supply_accounts_select_buyers on public.supply_accounts;
create policy supply_accounts_select_buyers
  on public.supply_accounts for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(id)
    or (is_published = true and public.auth_has_any_vendor_access())
  );

drop policy if exists supply_accounts_admin_write on public.supply_accounts;
create policy supply_accounts_admin_write
  on public.supply_accounts for all
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

-- supply_account_members
drop policy if exists supply_account_members_select_self on public.supply_account_members;
create policy supply_account_members_select_self
  on public.supply_account_members for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or user_id = auth.uid()
    or public.supply_account_staff_may_manage(supply_account_id)
  );

drop policy if exists supply_account_members_admin_write on public.supply_account_members;
create policy supply_account_members_admin_write
  on public.supply_account_members for all
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

-- b2b_listings
drop policy if exists b2b_listings_select on public.b2b_listings;
create policy b2b_listings_select
  on public.b2b_listings for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
    or (
      visibility = 'live'
      and exists (
        select 1 from public.supply_accounts sa
        where sa.id = b2b_listings.supply_account_id
          and sa.is_published = true
      )
      and public.auth_has_any_vendor_access()
      and (
        starts_at is null or starts_at <= now()
      )
      and (
        ends_at is null or ends_at >= now()
      )
    )
  );

drop policy if exists b2b_listings_supply_write on public.b2b_listings;
create policy b2b_listings_supply_write
  on public.b2b_listings for insert
  to authenticated
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
  );

drop policy if exists b2b_listings_supply_update on public.b2b_listings;
create policy b2b_listings_supply_update
  on public.b2b_listings for update
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
  )
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
  );

drop policy if exists b2b_listings_supply_delete on public.b2b_listings;
create policy b2b_listings_supply_delete
  on public.b2b_listings for delete
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
  );

-- b2b_listing_promos (via listing's supply account)
drop policy if exists b2b_listing_promos_select on public.b2b_listing_promos;
create policy b2b_listing_promos_select
  on public.b2b_listing_promos for select
  to authenticated
  using (
    exists (
      select 1 from public.b2b_listings l
      where l.id = b2b_listing_promos.listing_id
        and (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or public.supply_account_staff_may_manage(l.supply_account_id)
          or (
            l.visibility = 'live'
            and exists (
              select 1 from public.supply_accounts sa
              where sa.id = l.supply_account_id and sa.is_published = true
            )
            and public.auth_has_any_vendor_access()
            and (l.starts_at is null or l.starts_at <= now())
            and (l.ends_at is null or l.ends_at >= now())
          )
        )
    )
  );

drop policy if exists b2b_listing_promos_write on public.b2b_listing_promos;
create policy b2b_listing_promos_write
  on public.b2b_listing_promos for all
  to authenticated
  using (
    exists (
      select 1 from public.b2b_listings l
      where l.id = b2b_listing_promos.listing_id
        and (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or public.supply_account_staff_may_manage(l.supply_account_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.b2b_listings l
      where l.id = b2b_listing_promos.listing_id
        and (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or public.supply_account_staff_may_manage(l.supply_account_id)
        )
    )
  );

-- b2b_rfq_requests
drop policy if exists b2b_rfq_requests_select on public.b2b_rfq_requests;
create policy b2b_rfq_requests_select
  on public.b2b_rfq_requests for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.vendor_staff_may_manage(buyer_vendor_id)
    or public.supply_account_staff_may_manage(supplier_supply_account_id)
  );

drop policy if exists b2b_rfq_requests_insert on public.b2b_rfq_requests;
create policy b2b_rfq_requests_insert
  on public.b2b_rfq_requests for insert
  to authenticated
  with check (
    public.vendor_staff_may_manage(buyer_vendor_id)
    and exists (
      select 1 from public.supply_accounts sa
      where sa.id = supplier_supply_account_id
        and sa.is_published = true
    )
  );

drop policy if exists b2b_rfq_requests_update on public.b2b_rfq_requests;
create policy b2b_rfq_requests_update
  on public.b2b_rfq_requests for update
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supplier_supply_account_id)
    or public.vendor_staff_may_manage(buyer_vendor_id)
  )
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supplier_supply_account_id)
    or public.vendor_staff_may_manage(buyer_vendor_id)
  );

-- b2b_rfq_line_items
drop policy if exists b2b_rfq_line_items_select on public.b2b_rfq_line_items;
create policy b2b_rfq_line_items_select
  on public.b2b_rfq_line_items for select
  to authenticated
  using (
    exists (
      select 1 from public.b2b_rfq_requests r
      where r.id = b2b_rfq_line_items.rfq_id
        and (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or public.vendor_staff_may_manage(r.buyer_vendor_id)
          or public.supply_account_staff_may_manage(r.supplier_supply_account_id)
        )
    )
  );

drop policy if exists b2b_rfq_line_items_insert on public.b2b_rfq_line_items;
create policy b2b_rfq_line_items_insert
  on public.b2b_rfq_line_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.b2b_rfq_requests r
      where r.id = b2b_rfq_line_items.rfq_id
        and public.vendor_staff_may_manage(r.buyer_vendor_id)
    )
  );

drop policy if exists b2b_rfq_line_items_delete on public.b2b_rfq_line_items;
create policy b2b_rfq_line_items_delete
  on public.b2b_rfq_line_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.b2b_rfq_requests r
      where r.id = b2b_rfq_line_items.rfq_id
        and public.vendor_staff_may_manage(r.buyer_vendor_id)
        and r.status = 'submitted'
    )
  );

-- Grants
grant select, insert, update, delete on public.supply_accounts to authenticated;
grant select, insert, update, delete on public.supply_account_members to authenticated;
grant select, insert, update, delete on public.b2b_listings to authenticated;
grant select, insert, update, delete on public.b2b_listing_promos to authenticated;
grant select, insert, update, delete on public.b2b_rfq_requests to authenticated;
grant select, insert, update, delete on public.b2b_rfq_line_items to authenticated;

comment on table public.supply_accounts is 'B2B supply-side org (brand or distributor), curated by admin.';
comment on table public.supply_account_members is 'Users who may edit supply listings and respond to RFQs.';
comment on table public.b2b_listings is 'Wholesale-style SKU rows visible to retail vendors when live.';
comment on table public.b2b_listing_promos is 'Optional promos attached to a B2B listing.';
comment on table public.b2b_rfq_requests is 'Vendor buyer RFQ to a supply account (no on-platform payment v1).';
comment on table public.b2b_rfq_line_items is 'Line items on an RFQ; listing must be live and belong to supplier.';

-- ---------------------------------------------------------------------------
-- catalog_products: supply portal members may read verified SKUs for their brand
-- (must run after supply_accounts / supply_account_members exist)
-- ---------------------------------------------------------------------------

create or replace function public.supply_staff_may_read_catalog_for_brand(p_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or exists (
      select 1
      from public.supply_accounts sa
      join public.supply_account_members m on m.supply_account_id = sa.id
      where m.user_id = auth.uid()
        and sa.brand_id is not null
        and sa.brand_id = p_brand_id
    );
$$;

revoke all on function public.supply_staff_may_read_catalog_for_brand(uuid) from public;
grant execute on function public.supply_staff_may_read_catalog_for_brand(uuid) to authenticated;

comment on function public.supply_staff_may_read_catalog_for_brand(uuid) is
  'True when user is supply_account_member for a supply_accounts row with this brand_id, or admin.';

drop policy if exists catalog_products_supply_brand_select on public.catalog_products;
create policy catalog_products_supply_brand_select
  on public.catalog_products for select
  to authenticated
  using (
    exists (
      select 1 from public.brands b
      where b.id = catalog_products.brand_id
        and b.verified = true
    )
    and public.supply_staff_may_read_catalog_for_brand(catalog_products.brand_id)
  );
