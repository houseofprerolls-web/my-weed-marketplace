-- Optional list-price discount for menus (no product_deals row). Shoppers see price_cents as list; sale price = list * (1 - pct/100).

alter table public.products
  add column if not exists sale_discount_percent integer null;

alter table public.products
  drop constraint if exists products_sale_discount_percent_range;

alter table public.products
  add constraint products_sale_discount_percent_range
  check (
    sale_discount_percent is null
    or (sale_discount_percent >= 1 and sale_discount_percent <= 99)
  );

comment on column public.products.sale_discount_percent is
  'Optional percent off retail (1–99). List price stays in price_cents; shoppers pay the discounted amount.';
