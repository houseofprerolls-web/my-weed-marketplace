-- Stiiizy homepage hero: prefer `.png` under public/banners/homepage (see 0160 / siteBanners normalize).
-- Bump sort_order so the slide is more likely to appear first in the carousel.

do $s$
begin
  if to_regclass('public.site_marketing_banners') is null then
    raise notice '0166: site_marketing_banners missing — skipped';
    return;
  end if;

  update public.site_marketing_banners
  set
    image_url = regexp_replace(image_url, '\.svg$', '.png', 'i'),
    updated_at = now()
  where status = 'active'
    and placement_key = 'homepage_hero'
    and image_url ~* 'stiiizy|stiizy'
    and image_url like '/banners/homepage/%'
    and image_url ~* '\.svg$';

  update public.site_marketing_banners
  set
    sort_order = -1,
    updated_at = now()
  where status = 'active'
    and placement_key = 'homepage_hero'
    and (
      lower(coalesce(image_url, '')) like '%stiiizy%'
      or lower(coalesce(image_url, '')) like '%stiizy%'
      or lower(coalesce(link_url, '')) like '%stiiizy%'
      or lower(coalesce(link_url, '')) like '%stiizy%'
      or lower(coalesce(admin_note, '')) like '%stiiizy%'
      or lower(coalesce(admin_note, '')) like '%stiizy%'
    );

  insert into public.site_marketing_banners (
    placement_key,
    title,
    image_url,
    link_url,
    sort_order,
    listing_market_id,
    vendor_id,
    admin_note,
    status
  )
  select
    'homepage_hero',
    'STIIIZY',
    '/banners/homepage/stiiizy-homepage.png',
    '/listing/' || v.slug,
    -1,
    null,
    null,
    'Homepage hero — STIIIZY (seed 0166; replace art in admin if needed)',
    'active'
  from public.vendors v
  where
    (
      lower(coalesce(v.slug, '')) like '%stiiizy%'
      or lower(coalesce(v.slug, '')) like '%stiizy%'
      or lower(coalesce(v.name, '')) like '%stiiizy%'
      or lower(coalesce(v.name, '')) like '%stiizy%'
    )
    and not exists (
      select 1
      from public.site_marketing_banners b
      where b.status = 'active'
        and b.placement_key = 'homepage_hero'
        and (
          lower(coalesce(b.image_url, '')) like '%stiiizy%'
          or lower(coalesce(b.image_url, '')) like '%stiizy%'
          or lower(coalesce(b.link_url, '')) like '%stiiizy%'
          or lower(coalesce(b.link_url, '')) like '%stiizy%'
          or lower(coalesce(b.admin_note, '')) like '%stiiizy%'
          or lower(coalesce(b.admin_note, '')) like '%stiizy%'
        )
    )
  order by v.id
  limit 1;
end
$s$;
