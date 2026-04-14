-- Use on-site PNG paths under `public/banners/homepage/*.png` (and `public/brand/datreehouse-logo.png`).
-- If a prior deploy ran an older 0160 that swapped rows to `.svg`, map those back to `.png`.

update public.smokers_club_homepage_banners
set
  image_url = case image_url
    when '/banners/homepage/uncle-green-grand-opening.svg' then '/banners/homepage/uncle-green-grand-opening.png'
    when '/banners/homepage/uncle-green-free-gift.svg' then '/banners/homepage/uncle-green-free-gift.png'
    when '/banners/homepage/super-fresh-farms-split-ounce.svg' then '/banners/homepage/super-fresh-farms-split-ounce.png'
    when '/banners/homepage/green-haven-banner.svg' then '/banners/homepage/green-haven-banner.png'
    else image_url
  end,
  updated_at = now()
where status = 'approved'
  and image_url in (
    '/banners/homepage/uncle-green-grand-opening.svg',
    '/banners/homepage/uncle-green-free-gift.svg',
    '/banners/homepage/super-fresh-farms-split-ounce.svg',
    '/banners/homepage/green-haven-banner.svg'
  );
