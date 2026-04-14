-- Creative format ids (max-width / column presets). Live aspect is 1235×338 ≈3.65:1 for all.

alter table public.marketing_banner_slides
  add column if not exists creative_format text not null default 'leaderboard';

alter table public.marketing_banner_slides drop constraint if exists marketing_banner_slides_creative_format_check;

alter table public.marketing_banner_slides
  add constraint marketing_banner_slides_creative_format_check
  check (
    creative_format in (
      'leaderboard',
      'medium_rectangle',
      'large_rectangle',
      'skyscraper',
      'wide_skyscraper',
      'mobile_banner'
    )
  );

comment on column public.marketing_banner_slides.creative_format is
  'Layout preset: leaderboard, medium_rectangle, large_rectangle, skyscraper, wide_skyscraper, mobile_banner. Canvas 1235×338 (≈3.65:1); presets vary max width / column only.';
