-- Anon/authenticated clients resolve `listing_markets.region_key` for state-wide homepage banner scoping.
-- Migration 0120 left only admin policies on this table; without a public SELECT, banner filtering cannot work in the browser.

do $lm$
begin
  if to_regclass('public.listing_markets') is null then
    return;
  end if;

  drop policy if exists listing_markets_public_select on public.listing_markets;
  create policy listing_markets_public_select
    on public.listing_markets for select
    to anon, authenticated
    using (true);
end
$lm$;

comment on policy listing_markets_public_select on public.listing_markets is
  'Public read for market metadata (name, region_key, etc.) used by the storefront and banner region matching.';
