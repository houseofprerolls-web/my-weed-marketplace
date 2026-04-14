-- Brands table + linking products to a brand.
-- Vendors can categorize products by brand in their menu UI.

do $$
begin
  if to_regclass('public.brands') is null then
    create table public.brands (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      slug text not null unique,
      verified boolean not null default false,
      created_at timestamptz not null default now()
    );
  end if;
end $$;

alter table public.brands enable row level security;

drop policy if exists brands_public_verified_select on public.brands;
create policy brands_public_verified_select
  on public.brands for select
  to anon
  using (verified = true);

drop policy if exists brands_authed_verified_select on public.brands;
create policy brands_authed_verified_select
  on public.brands for select
  to authenticated
  using (verified = true);

-- Admin management for brands (create/update/verify).
do $admin_policies$
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

  drop policy if exists brands_admin_all on public.brands;
  create policy brands_admin_all
    on public.brands for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());
end $admin_policies$;

-- Add FK from products -> brands.
do $prod_cols$
begin
  if to_regclass('public.products') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'brand_id'
  ) then
    alter table public.products
      add column brand_id uuid references public.brands (id) on delete set null;
  end if;
end $prod_cols$;

create index if not exists products_brand_idx on public.products (brand_id);

