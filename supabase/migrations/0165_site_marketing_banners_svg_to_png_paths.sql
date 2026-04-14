-- 0160 fixed paths on smokers_club_homepage_banners; that table is gone after 0162.
-- Same bundled creatives: DB may still reference `.svg` while `public/banners/homepage/*.png` is canonical.

do $m$
begin
  if to_regclass('public.site_marketing_banners') is null then
    raise notice '0165: site_marketing_banners missing — skipped';
    return;
  end if;

  update public.site_marketing_banners
  set
    image_url = case image_url
      when '/banners/homepage/uncle-green-grand-opening.svg' then '/banners/homepage/uncle-green-grand-opening.png'
      when '/banners/homepage/uncle-green-free-gift.svg' then '/banners/homepage/uncle-green-free-gift.png'
      when '/banners/homepage/super-fresh-farms-split-ounce.svg' then '/banners/homepage/super-fresh-farms-split-ounce.png'
      when '/banners/homepage/green-haven-banner.svg' then '/banners/homepage/green-haven-banner.png'
      else image_url
    end,
    updated_at = now()
  where image_url in (
    '/banners/homepage/uncle-green-grand-opening.svg',
    '/banners/homepage/uncle-green-free-gift.svg',
    '/banners/homepage/super-fresh-farms-split-ounce.svg',
    '/banners/homepage/green-haven-banner.svg'
  );
end
$m$;
