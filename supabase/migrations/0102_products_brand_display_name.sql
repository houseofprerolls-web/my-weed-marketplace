-- Optional shelf label when there is no brands row or vendors want custom spelling.
alter table public.products
  add column if not exists brand_display_name text;

comment on column public.products.brand_display_name is
  'Shown on menus when brand_id is null, or as override hint; UI uses coalesce(brand.name, brand_display_name, store name).';
