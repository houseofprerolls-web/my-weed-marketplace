-- Launch publish cleanup (destructive): menus, HOP → Inland Empire premise/geo, market approvals,
-- delivery ZIP extras, service-mode pins (UG delivery / HOP storefront), Smokers Club treehouse UG+HOP only.
-- Apply once to the target DB after backup. Safe no-op when core tables or launch vendors are missing.

do $m$
declare
  hop_id uuid;
  ug_id uuid;
  tree_mkt record;
  pinned uuid[];
  i int;
begin
  if to_regclass('public.vendors') is null then
    raise notice '0197: public.vendors missing — skipped';
    return;
  end if;

  select v.id into hop_id
  from public.vendors v
  where v.slug in ('house-of-prerolls', 'saferock')
  order by case when v.slug = 'house-of-prerolls' then 0 else 1 end
  limit 1;

  select v.id into ug_id
  from public.vendors v
  where lower(v.slug) in ('uncle-green', 'unclegreen')
  order by case when v.slug = 'uncle-green' then 0 else 1 end, v.id
  limit 1;

  if hop_id is null and ug_id is null then
    raise notice '0197: no Uncle Green / House of Prerolls vendor rows — skipped';
    return;
  end if;

  -- -------------------------------------------------------------------------
  -- A. Products: keep menus only for launch vendors (Uncle Green + HOP).
  -- Dependent rows with ON DELETE CASCADE (e.g. product_quantity_tiers, product_unit_costs,
  -- vendor_menu_profile_hidden_products) remove automatically.
  -- -------------------------------------------------------------------------
  if to_regclass('public.products') is not null then
    delete from public.products p
    where not (
      (ug_id is not null and p.vendor_id = ug_id)
      or (hop_id is not null and p.vendor_id = hop_id)
    );
  end if;

  -- -------------------------------------------------------------------------
  -- B. House of Prerolls → Inland Empire storefront (premise + map point).
  -- -------------------------------------------------------------------------
  if hop_id is not null then
    update public.vendors v
    set
      address = '401 West 2nd Street',
      city = 'San Bernardino',
      state = 'CA',
      zip = '92401',
      location = st_setsrid(st_makepoint(-117.294::double precision, 34.105::double precision), 4326)::geography,
      admin_service_mode = 'force_storefront',
      allow_both_storefront_and_delivery = false
    where v.id = hop_id;
  end if;

  -- -------------------------------------------------------------------------
  -- B2. Uncle Green → delivery-first public lane (admin override; 0196 trigger).
  -- -------------------------------------------------------------------------
  if ug_id is not null then
    update public.vendors v
    set
      admin_service_mode = 'force_delivery',
      allow_both_storefront_and_delivery = false
    where v.id = ug_id;
  end if;

  -- -------------------------------------------------------------------------
  -- C. vendor_market_operations: unapprove every non–launch-critical vendor.
  -- Then tighten UG (LA + OC) and HOP (Inland Empire only).
  -- -------------------------------------------------------------------------
  if to_regclass('public.vendor_market_operations') is not null
     and to_regclass('public.listing_markets') is not null then

    update public.vendor_market_operations vmo
    set approved = false
    where not (
      (ug_id is not null and vmo.vendor_id = ug_id)
      or (hop_id is not null and vmo.vendor_id = hop_id)
    );

    if ug_id is not null then
      update public.vendor_market_operations vmo
      set approved = (lmkt.slug in ('greater-los-angeles', 'orange-county'))
      from public.listing_markets lmkt
      where vmo.vendor_id = ug_id
        and vmo.market_id = lmkt.id;

      insert into public.vendor_market_operations (vendor_id, market_id, approved, note)
      select ug_id, lmkt.id, true, '0197-ug-la-oc'
      from public.listing_markets lmkt
      where lmkt.slug in ('greater-los-angeles', 'orange-county')
      on conflict (vendor_id, market_id) do update
      set approved = excluded.approved,
          note = excluded.note;
    end if;

    if hop_id is not null then
      update public.vendor_market_operations vmo
      set approved = false
      where vmo.vendor_id = hop_id;

      update public.vendor_market_operations vmo
      set approved = true
      from public.listing_markets lmkt
      where vmo.vendor_id = hop_id
        and vmo.market_id = lmkt.id
        and lmkt.slug = 'inland-empire';

      insert into public.vendor_market_operations (vendor_id, market_id, approved, note)
      select hop_id, lmkt.id, true, '0197-hop-ie'
      from public.listing_markets lmkt
      where lmkt.slug = 'inland-empire'
      on conflict (vendor_id, market_id) do update
      set approved = excluded.approved,
          note = excluded.note;
    end if;
  end if;

  -- -------------------------------------------------------------------------
  -- C2. Drop explicit delivery-ZIP coverage for vendors we are not launching.
  -- -------------------------------------------------------------------------
  if to_regclass('public.vendor_delivery_zip5') is not null then
    delete from public.vendor_delivery_zip5 d
    where not (
      (ug_id is not null and d.vendor_id = ug_id)
      or (hop_id is not null and d.vendor_id = hop_id)
    );
  end if;

  -- -------------------------------------------------------------------------
  -- D. Smokers Club treehouse: only Uncle Green + House of Prerolls (LA / OC / IE).
  -- -------------------------------------------------------------------------
  if to_regclass('public.vendor_market_listings') is null
     or to_regclass('public.listing_markets') is null
     or to_regclass('public.vendor_market_operations') is null then
    raise notice '0197: treehouse tables missing — skipped pins';
    return;
  end if;

  delete from public.vendor_market_listings vml
  using public.listing_markets lmkt
  where vml.market_id = lmkt.id
    and lmkt.slug in ('greater-los-angeles', 'orange-county', 'inland-empire')
    and vml.club_lane = 'treehouse'
    and vml.slot_rank between 1 and 7;

  for tree_mkt in
    select lm2.id, lm2.slug
    from public.listing_markets lm2
    where lm2.slug in ('greater-los-angeles', 'orange-county', 'inland-empire')
  loop
    pinned := array[]::uuid[];

    if tree_mkt.slug = 'greater-los-angeles' then
      if ug_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = ug_id and o.market_id = tree_mkt.id and o.approved = true
         )
      then
        pinned := array_append(pinned, ug_id);
      end if;
      if hop_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = hop_id and o.market_id = tree_mkt.id and o.approved = true
         )
         and not hop_id = any (pinned)
      then
        pinned := array_append(pinned, hop_id);
      end if;
    elsif tree_mkt.slug = 'orange-county' then
      if ug_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = ug_id and o.market_id = tree_mkt.id and o.approved = true
         )
      then
        pinned := array_append(pinned, ug_id);
      end if;
      if hop_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = hop_id and o.market_id = tree_mkt.id and o.approved = true
         )
         and not hop_id = any (pinned)
      then
        pinned := array_append(pinned, hop_id);
      end if;
    elsif tree_mkt.slug = 'inland-empire' then
      if hop_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = hop_id and o.market_id = tree_mkt.id and o.approved = true
         )
      then
        pinned := array_append(pinned, hop_id);
      end if;
      if ug_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = ug_id and o.market_id = tree_mkt.id and o.approved = true
         )
         and not ug_id = any (pinned)
      then
        pinned := array_append(pinned, ug_id);
      end if;
    end if;

    -- Launch treehouse: pinned launch partners only (no random backfill).
    i := 1;
    while i <= coalesce(array_length(pinned, 1), 0) loop
      insert into public.vendor_market_listings (
        market_id,
        vendor_id,
        slot_rank,
        club_lane,
        is_premium,
        active
      ) values (
        tree_mkt.id,
        pinned[i],
        i,
        'treehouse',
        true,
        true
      );
      i := i + 1;
    end loop;
  end loop;
end
$m$;
