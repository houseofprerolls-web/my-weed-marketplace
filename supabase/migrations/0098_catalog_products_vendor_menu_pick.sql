--A Master catalog (per brand) that vendors can copy onto their own menu with a chosen price.

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  name text not null,
  category text not null
    check (category in ('flower', 'edible', 'vape', 'concentrate', 'topical', 'preroll', 'other')),
  description text,
  images text[] not null default '{}'::text[],
  strain_id uuid,
  potency_thc numeric,
  potency_cbd numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $strain_fk$
begin
  if to_regclass('public.strains') is not null then
    alter table public.catalog_products
      drop constraint if exists catalog_products_strain_id_fkey;
    alter table public.catalog_products
      add constraint catalog_products_strain_id_fkey
      foreign key (strain_id) references public.strains (id) on delete set null;
  end if;
end $strain_fk$;

create index if not exists catalog_products_brand_id_idx on public.catalog_products (brand_id);
create index if not exists catalog_products_name_idx on public.catalog_products (name);

alter table public.catalog_products enable row level security;

drop policy if exists catalog_products_vendor_admin_select on public.catalog_products;
create policy catalog_products_vendor_admin_select
  on public.catalog_products for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      where b.id = catalog_products.brand_id
        and b.verified = true
    )
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('vendor', 'admin')
    )
  );

do $admin_cat$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    return;
  end if;

  drop policy if exists catalog_products_admin_all on public.catalog_products;
  create policy catalog_products_admin_all
    on public.catalog_products for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());
end $admin_cat$;

-- Link vendor menu rows back to the master SKU (optional).
do $pcol$
begin
  if to_regclass('public.products') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'catalog_product_id'
  ) then
    alter table public.products
      add column catalog_product_id uuid references public.catalog_products (id) on delete set null;
  end if;
end $pcol$;

create unique index if not exists products_vendor_catalog_product_unique
  on public.products (vendor_id, catalog_product_id)
  where catalog_product_id is not null;

create index if not exists products_catalog_product_id_idx on public.products (catalog_product_id)
  where catalog_product_id is not null;
