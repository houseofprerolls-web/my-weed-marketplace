-- Reorder Smokers Club treehouse for Greater LA, Orange County, and Inland Empire only.
-- (Use when 0146 already ran with older pin rules; safe no-op overlap if combined with updated 0146 on fresh DB.)
-- LA: 1 Super Fresh Farms, 2 Green Haven, 3 Uncle Green + photo backfill.
-- OC: 1 Uncle Green, 2 House of Prerolls + backfill.
-- IE: 1 House of Prerolls, 2 Uncle Green + backfill.

delete from public.vendor_market_listings vml
using public.listing_markets lm
where vml.market_id = lm.id
  and lm.slug in ('greater-los-angeles', 'orange-county', 'inland-empire')
  and vml.club_lane = 'treehouse'
  and vml.slot_rank between 1 and 7;

do $reorder$
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
    raise notice '0148: missing tables — skipped';
    return;
  end if;

  select v.id into hop_id
  from public.vendors v
  where v.slug in ('house-of-prerolls', 'saferock')
  order by case when v.slug = 'house-of-prerolls' then 0 else 1 end
  limit 1;

  select v.id into sff_id
  from public.vendors v
  where lower(v.slug) in ('super-fresh-farms', 'superfresh-farms', 'super-fresh')
    or lower(v.name) like '%super fresh%farm%'
  order by case when lower(v.slug) = 'super-fresh-farms' then 0 else 1 end, v.id
  limit 1;

  select v.id into ug_id
  from public.vendors v
  where lower(v.slug) in ('uncle-green', 'unclegreen')
    or lower(replace(v.name, '.', '')) like '%uncle green%'
  order by case when v.slug = 'uncle-green' then 0 else 1 end, v.id
  limit 1;

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
    where lm2.slug in ('greater-los-angeles', 'orange-county', 'inland-empire')
  loop
    pinned := array[]::uuid[];

    if lm.slug = 'greater-los-angeles' then
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
    elsif lm.slug = 'orange-county' then
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
    elsif lm.slug = 'inland-empire' then
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
$reorder$;
