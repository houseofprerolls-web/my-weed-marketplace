-- Idempotent: ensure marketing_banner_slides.creative_format (same as 0168) if a project skipped it.

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
  'Layout preset: leaderboard, medium_rectangle, large_rectangle, skyscraper, wide_skyscraper, mobile_banner.';
