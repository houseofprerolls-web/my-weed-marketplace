-- Optional per-SKU menu title color (storefront cards). Vendors pick a #hex swatch; null = theme default.

alter table public.products
  add column if not exists menu_text_color text;

comment on column public.products.menu_text_color is
  'Optional #RGB / #RRGGBB / #RRGGBBAA for product name on public menu cards; null uses default white/theme.';
