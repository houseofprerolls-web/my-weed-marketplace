-- Homepage hero carousel creatives served from Next.js `public/banners/homepage/*`.
-- Archives prior approved vendor-owned rows for these shops only (Stiiizy and other vendors unchanged).
-- Uncle Green uses two `admin` rows so both creatives can run (unique index is per vendor_id + placement).

update public.smokers_club_homepage_banners b
set
  status = 'archived',
  updated_at = now()
where b.status = 'approved'
  and b.placement_key = 'homepage_hero'
  and b.banner_kind = 'vendor'
  and b.vendor_id in (
    select v.id
    from public.vendors v
    where lower(v.slug) in (
      'super-fresh-farms',
      'superfresh-farms',
      'super-fresh',
      'green-haven',
      'green-haven-la',
      'greenhaven',
      'uncle-green',
      'unclegreen',
      'uncle-green-dispensary'
    )
  );

-- Uncle Green (two slides; explicit listing link).
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
  'homepage_hero',
  '/banners/homepage/uncle-green-grand-opening.png',
  '/listing/' || v.slug,
  'wide_banner',
  'approved',
  'Homepage hero — Uncle Green grand opening'
from public.vendors v
where lower(v.slug) in ('uncle-green', 'unclegreen')
order by case when v.slug = 'uncle-green' then 0 else 1 end, v.id
limit 1;

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
  'homepage_hero',
  '/banners/homepage/uncle-green-free-gift.png',
  '/listing/' || v.slug,
  'wide_banner',
  'approved',
  'Homepage hero — Uncle Green free gift'
from public.vendors v
where lower(v.slug) in ('uncle-green', 'unclegreen')
order by case when v.slug = 'uncle-green' then 0 else 1 end, v.id
limit 1;

-- Super Fresh Farms — vendor row (clicks use listing when link_url is null).
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
  'vendor',
  v.id,
  'homepage_hero',
  '/banners/homepage/super-fresh-farms-split-ounce.png',
  null,
  'wide_banner',
  'approved',
  'Homepage hero — Super Fresh Farms split ounce'
from public.vendors v
where lower(v.slug) in ('super-fresh-farms', 'superfresh-farms', 'super-fresh')
order by
  case lower(v.slug)
    when 'super-fresh-farms' then 0
    when 'superfresh-farms' then 1
    else 2
  end,
  v.id
limit 1;

-- Green Haven.
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
  'vendor',
  v.id,
  'homepage_hero',
  '/banners/homepage/green-haven-banner.png',
  null,
  'wide_banner',
  'approved',
  'Homepage hero — Green Haven'
from public.vendors v
where lower(v.slug) in ('green-haven', 'green-haven-la', 'greenhaven')
order by
  case v.slug
    when 'green-haven' then 0
    when 'green-haven-la' then 1
    else 2
  end,
  v.id
limit 1;
