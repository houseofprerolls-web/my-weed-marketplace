-- Repopulate Smokers Club treehouse slots 1–7 for every CA/NY listing market.
-- Photo-qualified = non-empty trimmed logo_url OR banner_url.
-- Eligibility: vendor_market_operations.approved, is_live, license_status = approved,
--   (offers_delivery OR offers_storefront) with same coalesce defaults as the app.
--
-- Regional intent (treehouse slot order where vendor resolves + vmo.approved for that market):
-- - Greater LA: 1 Super Fresh Farms, 2 Green Haven, 3 Uncle Green; then photo backfill.
-- - Orange County: 1 Uncle Green, 2 House of Prerolls; then backfill.
-- - Inland Empire: 1 House of Prerolls, 2 Uncle Green; then backfill.
-- - Other CA/NY markets: no brand pins; md5(market_id || vendor_id) photo-qualified backfill only.

-- Clear existing treehouse placements in slots 1–7 for CA/NY.
delete from public.vendor_market_listings vml
using public.listing_markets lm
where vml.market_id = lm.id
  and lm.region_key in ('ca', 'ny')
  and vml.club_lane = 'treehouse'
  and vml.slot_rank between 1 and 7;

do $sc$
declare
  lm record;
  hop_id uuid;
  sff_id uuid;
  ug_id uuid;
  gh_id uuid;
  pinned uuid[];
  fill_n int;
  v_rec record;
  i int;
begin
  if to_regclass('public.listing_markets') is null
     or to_regclass('public.vendors') is null
     or to_regclass('public.vendor_market_operations') is null then
    raise notice '0146: missing tables — skipped';
    return;
  end if;

  -- House of Prerolls (post-rebrand slug; legacy QA slug).
  select v.id into hop_id
  from public.vendors v
  where v.slug in ('house-of-prerolls', 'saferock')
  order by case when v.slug = 'house-of-prerolls' then 0 else 1 end
  limit 1;

  -- Super Fresh Farms (slug or DBA-style name).
  select v.id into sff_id
  from public.vendors v
  where lower(v.slug) in ('super-fresh-farms', 'superfresh-farms', 'super-fresh')
    or lower(v.name) like '%super fresh%farm%'
  order by case when lower(v.slug) = 'super-fresh-farms' then 0 else 1 end, v.id
  limit 1;

  -- Uncle Green.
  select v.id into ug_id
  from public.vendors v
  where lower(v.slug) in ('uncle-green', 'unclegreen')
    or lower(replace(v.name, '.', '')) like '%uncle green%'
  order by case when v.slug = 'uncle-green' then 0 else 1 end, v.id
  limit 1;

  -- Green Haven (LA-focused; avoid unrelated "Haven" chains when possible).
  select v.id into gh_id
  from public.vendors v
  where lower(v.slug) in ('green-haven', 'green-haven-la', 'greenhaven')
    or (
      lower(v.name) like '%green haven%'
      and v.state = 'CA'
      and (
        left(nullif(trim(v.zip), ''), 3) in (
          '900','901','902','903','904','905','906','907','908',
          '910','911','912','913','914','915','916','917','918'
        )
        or lower(coalesce(v.city, '')) like '%los angeles%'
      )
    )
  order by case when v.slug = 'green-haven' then 0 else 1 end, v.id
  limit 1;

  for lm in
    select lm2.id, lm2.slug, lm2.region_key
    from public.listing_markets lm2
    where lm2.region_key in ('ca', 'ny')
  loop
    pinned := array[]::uuid[];

    if lm.region_key = 'ca' and lm.slug = 'greater-los-angeles' then
      -- Slot order: Super Fresh Farms, Green Haven, Uncle Green.
      if sff_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = sff_id and o.market_id = lm.id and o.approved = true
         )
      then
        pinned := array_append(pinned, sff_id);
      end if;
      if gh_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = gh_id and o.market_id = lm.id and o.approved = true
         )
         and not gh_id = any (pinned)
      then
        pinned := array_append(pinned, gh_id);
      end if;
      if ug_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = ug_id and o.market_id = lm.id and o.approved = true
         )
         and not ug_id = any (pinned)
      then
        pinned := array_append(pinned, ug_id);
      end if;
    elsif lm.region_key = 'ca' and lm.slug = 'orange-county' then
      -- Uncle Green, then House of Prerolls.
      if ug_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = ug_id and o.market_id = lm.id and o.approved = true
         )
      then
        pinned := array_append(pinned, ug_id);
      end if;
      if hop_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = hop_id and o.market_id = lm.id and o.approved = true
         )
         and not hop_id = any (pinned)
      then
        pinned := array_append(pinned, hop_id);
      end if;
    elsif lm.region_key = 'ca' and lm.slug = 'inland-empire' then
      -- House of Prerolls, then Uncle Green.
      if hop_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = hop_id and o.market_id = lm.id and o.approved = true
         )
      then
        pinned := array_append(pinned, hop_id);
      end if;
      if ug_id is not null
         and exists (
           select 1 from public.vendor_market_operations o
           where o.vendor_id = ug_id and o.market_id = lm.id and o.approved = true
         )
         and not ug_id = any (pinned)
      then
        pinned := array_append(pinned, ug_id);
      end if;
    end if;

    fill_n := 7 - coalesce(array_length(pinned, 1), 0);
    if fill_n > 0 then
      for v_rec in
        select v.id as vid
        from public.vendors v
        inner join public.vendor_market_operations vmo
          on vmo.vendor_id = v.id
          and vmo.market_id = lm.id
          and vmo.approved = true
        where coalesce(v.is_live, false) = true
          and coalesce(v.license_status, '') = 'approved'
          and (
            coalesce(v.offers_delivery, false) = true
            or coalesce(v.offers_storefront, true) = true
          )
          and (
            nullif(trim(coalesce(v.logo_url, '')), '') is not null
            or nullif(trim(coalesce(v.banner_url, '')), '') is not null
          )
          and not v.id = any (pinned)
        order by md5(lm.id::text || v.id::text)
        limit fill_n
      loop
        pinned := array_append(pinned, v_rec.vid);
      end loop;
    end if;

    i := 1;
    while i <= least(7, coalesce(array_length(pinned, 1), 0)) loop
      insert into public.vendor_market_listings (
        market_id,
        vendor_id,
        slot_rank,
        club_lane,
        is_premium,
        active
      ) values (
        lm.id,
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
$sc$;
