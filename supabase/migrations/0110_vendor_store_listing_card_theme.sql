-- Optional storefront / discover / Smokers Club row card theme. Null = inherit menu SKU card theme.
alter table public.vendors
  add column if not exists store_listing_card_preset text;

alter table public.vendors
  add column if not exists store_listing_card_background_url text;

alter table public.vendors
  add column if not exists store_listing_card_overlay_opacity integer;

comment on column public.vendors.store_listing_card_preset is
  'When set, overrides sku_card_preset for store cards (Discover, listing VendorCard, Smokers Club shop rows). Same preset names as sku_card_preset.';

comment on column public.vendors.store_listing_card_background_url is
  'Custom background for store cards when store_listing_card_preset = custom; falls back to sku_card_background_url if empty.';

comment on column public.vendors.store_listing_card_overlay_opacity is
  'Overlay 0–85 for custom store card background; falls back to sku_card_overlay_opacity when null.';
