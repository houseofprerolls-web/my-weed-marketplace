-- Public brand showcase: story, visuals, and theme for /brands/[slug] (admin-managed).

alter table public.brands
  add column if not exists tagline text,
  add column if not exists about text,
  add column if not exists website_url text,
  add column if not exists social_instagram text,
  add column if not exists hero_image_url text,
  add column if not exists page_theme text not null default 'emerald';

alter table public.brands
  drop constraint if exists brands_page_theme_check;

alter table public.brands
  add constraint brands_page_theme_check
  check (page_theme in ('emerald', 'violet', 'sunset', 'ocean', 'mono'));

comment on column public.brands.tagline is 'Short line under the name on the public brand showcase.';
comment on column public.brands.about is 'Brand story (plain text; line breaks preserved in UI).';
comment on column public.brands.website_url is 'Official site URL for the showcase hero.';
comment on column public.brands.social_instagram is 'Instagram @handle or full URL.';
comment on column public.brands.hero_image_url is 'Optional wide hero image behind the brand header.';
comment on column public.brands.page_theme is 'Visual preset for the public brand page (emerald|violet|sunset|ocean|mono).';
