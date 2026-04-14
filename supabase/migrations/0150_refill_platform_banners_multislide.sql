-- Refill sponsored slideshow inventory: multiple admin slides per placement, partner rotation per surface.
-- Preserves anything Stiiizy-branded (image URL, link, vendor slug/name, or admin note).
-- Green Haven / Uncle Green / Super Fresh vendor rows are archived here and replaced by admin slides
-- (same art paths as public/banners/homepage/* — deploy those assets with the app).

update public.smokers_club_homepage_banners b
set
  status = 'archived',
  updated_at = now()
where b.status = 'approved'
  and not (
    lower(coalesce(b.image_url, '')) like '%stiiizy%'
    or lower(coalesce(b.image_url, '')) like '%stiizy%'
    or lower(coalesce(b.link_url, '')) like '%stiiizy%'
    or lower(coalesce(b.link_url, '')) like '%stiizy%'
    or lower(coalesce(b.admin_note, '')) like '%stiiizy%'
    or lower(coalesce(b.admin_note, '')) like '%stiizy%'
    or exists (
      select 1
      from public.vendors v
      where v.id = b.vendor_id
        and (
          lower(coalesce(v.slug, '')) like '%stiiizy%'
          or lower(coalesce(v.slug, '')) like '%stiizy%'
          or lower(coalesce(v.name, '')) like '%stiiizy%'
          or lower(coalesce(v.name, '')) like '%stiizy%'
        )
    )
  );

-- 4 partner creatives × 2 full passes = 8 slides per placement; starting creative rotates per placement_key.

with
  cre as (
    select *
    from
      (
        values
          (0, '/banners/homepage/uncle-green-grand-opening.png'::text, 'Uncle Green — grand opening'),
          (1, '/banners/homepage/uncle-green-free-gift.png', 'Uncle Green — free gift'),
          (2, '/banners/homepage/super-fresh-farms-split-ounce.png', 'Super Fresh Farms'),
          (3, '/banners/homepage/green-haven-banner.png', 'Green Haven')
      ) as t (n, image_url, title)
  ),
  plc as (
    select *
    from
      (
        values
          ('homepage_hero'::text, 0),
          ('smokers_club_strip', 1),
          ('discover_top', 2),
          ('discover_mid', 3),
          ('deals', 4),
          ('dispensaries', 5),
          ('map', 6),
          ('feed', 7)
      ) as p (placement_key, rot)
  ),
  seq as (
    select generate_series(0, 7) as i
  ),
  uncle_link as (
    select
      coalesce(
        (
          select '/listing/' || v.slug
          from public.vendors v
          where
            lower(v.slug) in (
              'uncle-green',
              'unclegreen'
            )
          order by v.slug
          limit
            1
        ),
        '/listing/uncle-green'
      ) as href
  ),
  super_link as (
    select
      coalesce(
        (
          select '/listing/' || v.slug
          from public.vendors v
          where
            lower(v.slug) in (
              'super-fresh-farms',
              'superfresh-farms',
              'super-fresh'
            )
          order by
            case lower(v.slug)
              when 'super-fresh-farms' then 0
              when 'superfresh-farms' then 1
              else 2
            end,
            v.id
          limit
            1
        ),
        '/listing/super-fresh-farms'
      ) as href
  ),
  haven_link as (
    select
      coalesce(
        (
          select '/listing/' || v.slug
          from public.vendors v
          where
            lower(v.slug) in (
              'green-haven',
              'green-haven-la',
              'greenhaven'
            )
          order by
            case lower(v.slug)
              when 'green-haven' then 0
              when 'green-haven-la' then 1
              else 2
            end,
            v.id
          limit
            1
        ),
        '/listing/green-haven'
      ) as href
  )
insert into public.smokers_club_homepage_banners (
  banner_kind,
  vendor_id,
  placement_key,
  image_url,
  link_url,
  slot_preset,
  status,
  admin_note
)
select
  'admin',
  null,
  plc.placement_key,
  cre.image_url,
  case cre.n
    when 0 then (select href from uncle_link)
    when 1 then (select href from uncle_link)
    when 2 then (select href from super_link)
    else (select href from haven_link)
  end,
  'wide_banner',
  'approved',
  cre.title || ' · ' || plc.placement_key || ' · refill 0150 #' || seq.i::text
from
  plc
  cross join seq
  join cre on cre.n = ((seq.i + plc.rot) % 4);
