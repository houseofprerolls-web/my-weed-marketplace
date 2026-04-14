-- Backfill Super Fresh Farms seed SKUs that still have empty `images` (e.g. inserted before logo placeholder).
-- Uses the storefront asset: greenzone-bolt/public/images/vendors/super-fresh-farms/sff-menu-placeholder.png

do $body$
declare
  v_id uuid;
  ph text := '/images/vendors/super-fresh-farms/sff-menu-placeholder.png';
begin
  select v.id into v_id
  from public.vendors v
  where lower(v.slug) in ('super-fresh-farms', 'superfresh-farms', 'super-fresh')
     or lower(v.name) like '%super%fresh%farm%'
  order by case when lower(v.slug) = 'super-fresh-farms' then 0 when lower(v.slug) = 'superfresh-farms' then 1 else 2 end
  limit 1;

  if v_id is null then
    raise notice '0220: No vendor matched for Super Fresh Farms — skipped';
    return;
  end if;

  if to_regclass('public.products') is null then
    raise notice '0220: public.products missing — skipped';
    return;
  end if;

  update public.products p
  set images = array[ph]::text[]
  where p.vendor_id = v_id
    and p.description is not null
    and p.description like '%Super Fresh Farms menu seed 2026-04-13%'
    and coalesce(cardinality(p.images), 0) = 0;
end;
$body$;
