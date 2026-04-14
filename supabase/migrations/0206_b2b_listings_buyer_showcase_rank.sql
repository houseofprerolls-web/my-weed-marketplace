-- Optional ordering for buyer-facing supply storefront: featured SKUs after active deal SKUs.

alter table public.b2b_listings
  add column if not exists buyer_showcase_rank integer null;

alter table public.b2b_listings
  drop constraint if exists b2b_listings_buyer_showcase_rank_range;

alter table public.b2b_listings
  add constraint b2b_listings_buyer_showcase_rank_range
  check (buyer_showcase_rank is null or (buyer_showcase_rank >= 1 and buyer_showcase_rank <= 999));

comment on column public.b2b_listings.buyer_showcase_rank is
  'Lower numbers appear sooner on buyer catalog views (after SKUs tied to active supply deals). Null = default sort by recency.';
