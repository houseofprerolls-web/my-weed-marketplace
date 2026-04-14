-- Optional logo for brand directory / vendor product prefill when a brand is selected.
alter table public.brands
  add column if not exists logo_url text;

comment on column public.brands.logo_url is 'Public image URL (CDN). Used when vendors pick a brand on the product form to prefill menu photos.';
