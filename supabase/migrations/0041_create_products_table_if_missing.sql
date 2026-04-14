-- Create public.products + RLS when the table is missing (common if 0001_init was never applied).
-- Requires public.vendors. Optional FK to public.strains when that table exists.
-- Public catalog policy matches 0021 (in-stock + live + approved vendor).

do $mig_create_products_if_missing$
begin
  if to_regclass('public.products') is not null then
    raise notice '0041: public.products already exists — skipped';
    return;
  end if;

  if to_regclass('public.vendors') is null then
    raise exception
      '0041: public.vendors is missing. Apply your core vendor schema first, then re-run migrations.';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception
      '0041: public.profiles is missing. Apply profiles/auth migrations before products.';
  end if;

  create table public.products (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references public.vendors (id) on delete cascade,
    strain_id uuid,
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
    created_at timestamptz not null default now(),
    profit_cents int not null default 0,
    constraint products_profit_cents_nonneg check (profit_cents >= 0)
  );

  if to_regclass('public.strains') is not null then
    alter table public.products
      add constraint products_strain_id_fkey
      foreign key (strain_id) references public.strains (id) on delete set null;
  end if;

  create index if not exists products_vendor_idx on public.products (vendor_id);
  create index if not exists products_strain_idx on public.products (strain_id);

  alter table public.products enable row level security;

  -- Match 0021: shoppers only see in-stock rows for live, approved vendors.
  create policy products_public_select on public.products
    for select
    using (
      in_stock = true
      and exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.is_live = true
          and v.license_status = 'approved'
      )
    );

  create policy products_vendor_write on public.products
    for all
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'vendor'
      )
    )
    with check (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'vendor'
      )
    );

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    create policy products_admin_all on public.products
      for all
      using (public.auth_is_profile_admin())
      with check (public.auth_is_profile_admin());
  else
    create policy products_admin_all on public.products
      for all
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;

  grant select on table public.products to anon;
  grant select, insert, update, delete on table public.products to authenticated;
  grant all on table public.products to service_role;

  raise notice '0041: created public.products, indexes, RLS, and grants';
end;
$mig_create_products_if_missing$;
