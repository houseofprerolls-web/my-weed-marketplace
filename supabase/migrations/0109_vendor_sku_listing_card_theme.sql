-- Vendor-customizable menu / listing SKU card appearance (public menu + matching surfaces).
alter table public.vendors
  add column if not exists sku_card_preset text not null default 'default';

alter table public.vendors
  add column if not exists sku_card_background_url text;

alter table public.vendors
  add column if not exists sku_card_overlay_opacity integer not null default 50;

comment on column public.vendors.sku_card_preset is
  'SKU card style on public listing menu and related grids: default | dark_glass | forest | ember | custom (uses sku_card_background_url).';

comment on column public.vendors.sku_card_background_url is
  'Full-card background image URL when sku_card_preset = custom; public CDN or storage URL.';

comment on column public.vendors.sku_card_overlay_opacity is
  'Dark overlay strength 0–85 on custom background (readability); default 50.';
