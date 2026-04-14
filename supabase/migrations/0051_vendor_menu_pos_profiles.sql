-- POS integration metadata, menu source mode (manual / pos / hybrid), regional menu profiles,
-- and per-profile hidden products for public menu filtering.

-- ---------------------------------------------------------------------------
-- products: optional POS linkage (sync jobs upsert rows using these keys)
-- ---------------------------------------------------------------------------
do $prod_pos_cols$
begin
  if to_regclass('public.products') is null then
    raise notice '0051: products missing — skipped pos columns';
    return;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'pos_provider'
  ) then
    alter table public.products add column pos_provider text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'pos_external_id'
  ) then
    alter table public.products add column pos_external_id text;
  end if;
end;
$prod_pos_cols$;

create unique index if not exists products_vendor_pos_unique
  on public.products (vendor_id, pos_provider, pos_external_id)
  where pos_external_id is not null and pos_provider is not null;

-- ---------------------------------------------------------------------------
-- vendor_menu_settings
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_menu_settings (
  vendor_id uuid primary key references public.vendors (id) on delete cascade,
  menu_source_mode text not null default 'manual'
    check (menu_source_mode in ('manual', 'pos', 'hybrid')),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_menu_settings_vendor_idx on public.vendor_menu_settings (vendor_id);

-- ---------------------------------------------------------------------------
-- vendor_pos_connections (non-secret config; use Vault for secrets in production)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_pos_connections (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  provider text not null
    check (provider in ('blaze', 'dutchie', 'treez', 'jane', 'leaflogix', 'flowhub', 'other')),
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'error', 'syncing')),
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (vendor_id, provider)
);

create index if not exists vendor_pos_connections_vendor_idx on public.vendor_pos_connections (vendor_id);

-- ---------------------------------------------------------------------------
-- Regional / cloned menu profiles (visibility rules per area)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_menu_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  region_key text not null,
  label text not null default 'Menu',
  is_master boolean not null default false,
  created_at timestamptz not null default now(),
  unique (vendor_id, region_key)
);

create index if not exists vendor_menu_profiles_vendor_idx on public.vendor_menu_profiles (vendor_id);
create index if not exists vendor_menu_profiles_master_idx on public.vendor_menu_profiles (vendor_id) where is_master = true;

create table if not exists public.vendor_menu_profile_hidden_products (
  profile_id uuid not null references public.vendor_menu_profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  primary key (profile_id, product_id)
);

create index if not exists vendor_menu_hidden_profile_idx on public.vendor_menu_profile_hidden_products (profile_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vendor_menu_settings enable row level security;
alter table public.vendor_pos_connections enable row level security;
alter table public.vendor_menu_profiles enable row level security;
alter table public.vendor_menu_profile_hidden_products enable row level security;

-- Vendor owner policies
drop policy if exists vendor_menu_settings_vendor_all on public.vendor_menu_settings;
create policy vendor_menu_settings_vendor_all
  on public.vendor_menu_settings for all
  using (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid())
  );

drop policy if exists vendor_menu_settings_public_read on public.vendor_menu_settings;
create policy vendor_menu_settings_public_read
  on public.vendor_menu_settings for select
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
  );

drop policy if exists vendor_pos_connections_vendor_all on public.vendor_pos_connections;
create policy vendor_pos_connections_vendor_all
  on public.vendor_pos_connections for all
  using (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid())
  );

drop policy if exists vendor_menu_profiles_vendor_all on public.vendor_menu_profiles;
create policy vendor_menu_profiles_vendor_all
  on public.vendor_menu_profiles for all
  using (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid())
  );

drop policy if exists vendor_menu_profiles_public_read on public.vendor_menu_profiles;
create policy vendor_menu_profiles_public_read
  on public.vendor_menu_profiles for select
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
  );

drop policy if exists vendor_menu_hidden_vendor_all on public.vendor_menu_profile_hidden_products;
create policy vendor_menu_hidden_vendor_all
  on public.vendor_menu_profile_hidden_products for all
  using (
    exists (
      select 1
      from public.vendor_menu_profiles p
      join public.vendors v on v.id = p.vendor_id
      where p.id = profile_id
        and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.vendor_menu_profiles p
      join public.vendors v on v.id = p.vendor_id
      where p.id = profile_id
        and v.user_id = auth.uid()
    )
  );

drop policy if exists vendor_menu_hidden_public_read on public.vendor_menu_profile_hidden_products;
create policy vendor_menu_hidden_public_read
  on public.vendor_menu_profile_hidden_products for select
  using (
    exists (
      select 1
      from public.vendor_menu_profiles p
      join public.vendors v on v.id = p.vendor_id
      where p.id = profile_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
  );

-- Admin (optional)
do $admin_policies_menu$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'auth_is_profile_admin' and p.pronargs = 0
  ) then
    return;
  end if;

  drop policy if exists vendor_menu_settings_admin on public.vendor_menu_settings;
  create policy vendor_menu_settings_admin
    on public.vendor_menu_settings for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());

  drop policy if exists vendor_pos_connections_admin on public.vendor_pos_connections;
  create policy vendor_pos_connections_admin
    on public.vendor_pos_connections for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());

  drop policy if exists vendor_menu_profiles_admin on public.vendor_menu_profiles;
  create policy vendor_menu_profiles_admin
    on public.vendor_menu_profiles for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());

  drop policy if exists vendor_menu_hidden_admin on public.vendor_menu_profile_hidden_products;
  create policy vendor_menu_hidden_admin
    on public.vendor_menu_profile_hidden_products for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());
end;
$admin_policies_menu$;

grant select on public.vendor_menu_settings to anon;
grant select, insert, update, delete on public.vendor_menu_settings to authenticated;
grant select on public.vendor_menu_profiles to anon;
grant select, insert, update, delete on public.vendor_menu_profiles to authenticated;
grant select on public.vendor_menu_profile_hidden_products to anon;
grant select, insert, update, delete on public.vendor_menu_profile_hidden_products to authenticated;
grant select, insert, update, delete on public.vendor_pos_connections to authenticated;
grant all on public.vendor_menu_settings to service_role;
grant all on public.vendor_pos_connections to service_role;
grant all on public.vendor_menu_profiles to service_role;
grant all on public.vendor_menu_profile_hidden_products to service_role;
