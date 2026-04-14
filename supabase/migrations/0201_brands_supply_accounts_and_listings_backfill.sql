-- Backfill: one supply_account per brand (missing only), brand_page_managers -> supply_account_members,
-- b2b_listings from catalog_products (idempotent).

do $migration$
declare
  v_accounts int := 0;
  v_members int := 0;
  v_listings int := 0;
begin
  if to_regclass('public.brands') is null or to_regclass('public.supply_accounts') is null then
    raise notice '0201 skip: brands or supply_accounts missing';
    return;
  end if;

  -- -------------------------------------------------------------------------
  -- 1) supply_accounts from brands (skip brands that already have brand_id)
  -- -------------------------------------------------------------------------
  with ins as (
    insert into public.supply_accounts (
      name,
      slug,
      account_type,
      brand_id,
      is_published,
      notes_admin
    )
    select
      b.name,
      case
        when exists (
          select 1
          from public.supply_accounts s
          where s.slug = coalesce(nullif(lower(trim(b.slug)), ''), 'brand-' || left(replace(b.id::text, '-', ''), 12))
            and (s.brand_id is distinct from b.id or s.brand_id is null)
        )
          then coalesce(nullif(lower(trim(b.slug)), ''), 'brand-' || left(replace(b.id::text, '-', ''), 12))
            || '-b2b-'
            || left(replace(b.id::text, '-', ''), 8)
        else coalesce(nullif(lower(trim(b.slug)), ''), 'brand-' || left(replace(b.id::text, '-', ''), 12))
      end,
      'brand'::text,
      b.id,
      b.verified,
      'backfill from brands (0201)'
    from public.brands b
    where not exists (select 1 from public.supply_accounts sa where sa.brand_id = b.id)
    returning id
  )
  select count(*)::int into v_accounts from ins;

  raise notice '0201 supply_accounts inserted: %', v_accounts;

  -- -------------------------------------------------------------------------
  -- 2) brand_page_managers -> supply_account_members (editor)
  -- -------------------------------------------------------------------------
  if to_regclass('public.brand_page_managers') is not null
     and to_regclass('public.supply_account_members') is not null then
    with ins as (
      insert into public.supply_account_members (supply_account_id, user_id, role)
      select sa.id, m.user_id, 'editor'::text
      from public.brand_page_managers m
      join public.supply_accounts sa on sa.brand_id = m.brand_id
      on conflict (supply_account_id, user_id) do nothing
      returning id
    )
    select count(*)::int into v_members from ins;

    raise notice '0201 supply_account_members inserted: %', v_members;
  else
    raise notice '0201 supply_account_members skipped (table missing)';
  end if;

  -- -------------------------------------------------------------------------
  -- 3) catalog_products -> b2b_listings (one row per SKU per supply account)
  -- -------------------------------------------------------------------------
  if to_regclass('public.catalog_products') is not null and to_regclass('public.b2b_listings') is not null then
    with ins as (
      insert into public.b2b_listings (
        supply_account_id,
        catalog_product_id,
        title_override,
        description,
        category,
        visibility
      )
      select
        sa.id,
        cp.id,
        null::text,
        cp.description,
        cp.category::text,
        case when b.verified then 'live'::text else 'draft'::text end
      from public.catalog_products cp
      join public.brands b on b.id = cp.brand_id
      join public.supply_accounts sa on sa.brand_id = b.id
      where not exists (
        select 1
        from public.b2b_listings l
        where l.supply_account_id = sa.id
          and l.catalog_product_id = cp.id
      )
      returning id
    )
    select count(*)::int into v_listings from ins;

    raise notice '0201 b2b_listings inserted: %', v_listings;
  else
    raise notice '0201 b2b_listings skipped (catalog_products or b2b_listings missing)';
  end if;
end
$migration$;
