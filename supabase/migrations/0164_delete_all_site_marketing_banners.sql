-- Remove every marketing banner row (live, pending, rejected, archived — all placements).

do $w$
begin
  if to_regclass('public.site_marketing_banners') is null then
    raise notice '0164: site_marketing_banners missing — skipped';
    return;
  end if;

  delete from public.site_marketing_banners;

  raise notice '0164: deleted all rows from site_marketing_banners';
end
$w$;
