import { cn } from '@/lib/utils';

export const MARKETING_BANNER_CREATIVE_FORMAT_IDS = [
  'leaderboard',
  'medium_rectangle',
  'large_rectangle',
  'skyscraper',
  'wide_skyscraper',
  'mobile_banner',
] as const;

export type MarketingBannerCreativeFormat = (typeof MARKETING_BANNER_CREATIVE_FORMAT_IDS)[number];

/** Canonical export size for crop tools — 1235×338 (≈3.65:1 wide banner). */
const CROP_W = 1235;
const CROP_H = 338;

export const MARKETING_BANNER_CREATIVE_FORMAT_META: Record<
  MarketingBannerCreativeFormat,
  { label: string; sizeLabel: string; width: number; height: number }
> = {
  leaderboard: {
    label: 'Standard banner',
    sizeLabel: '1235×338 (≈3.65:1)',
    width: CROP_W,
    height: CROP_H,
  },
  medium_rectangle: {
    label: 'Medium width',
    sizeLabel: 'Same 3.65:1 ratio, max width ~720px on desktop',
    width: CROP_W,
    height: CROP_H,
  },
  large_rectangle: {
    label: 'Large width',
    sizeLabel: 'Same 3.65:1 ratio, max width ~960px on desktop',
    width: CROP_W,
    height: CROP_H,
  },
  skyscraper: {
    label: 'Narrow column',
    sizeLabel: '3.65:1 in a narrow column (~300–400px)',
    width: CROP_W,
    height: CROP_H,
  },
  wide_skyscraper: {
    label: 'Wide column',
    sizeLabel: '3.65:1 in a wider column (~340–480px)',
    width: CROP_W,
    height: CROP_H,
  },
  mobile_banner: {
    label: 'Mobile-first (same slot)',
    sizeLabel: '1235×338 (≈3.65:1) — matches standard banner',
    width: CROP_W,
    height: CROP_H,
  },
};

export function normalizeMarketingBannerCreativeFormat(
  raw: string | null | undefined
): MarketingBannerCreativeFormat {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if ((MARKETING_BANNER_CREATIVE_FORMAT_IDS as readonly string[]).includes(s)) {
    return s as MarketingBannerCreativeFormat;
  }
  return 'leaderboard';
}

export function cropAspectRatioForFormat(format: MarketingBannerCreativeFormat): number {
  const m = MARKETING_BANNER_CREATIVE_FORMAT_META[normalizeMarketingBannerCreativeFormat(format)];
  return m.width / m.height;
}

/** Live slot aspect — matches 1235×338 (≈3.65:1). */
export const MARKETING_BANNER_SLOT_ASPECT_CLASS = 'aspect-[1235/338]';

const ASPECT_SLOT = MARKETING_BANNER_SLOT_ASPECT_CLASS;

export function marketingBannerViewportClassName(format: MarketingBannerCreativeFormat): string {
  const f = normalizeMarketingBannerCreativeFormat(format);
  switch (f) {
    case 'leaderboard':
    case 'mobile_banner':
      return cn(
        'relative mx-auto block w-full min-w-0 overflow-hidden',
        ASPECT_SLOT,
        'max-w-full sm:max-w-[min(100%,960px)]'
      );
    case 'medium_rectangle':
      return cn(
        'relative mx-auto block w-full min-w-0 overflow-hidden',
        ASPECT_SLOT,
        'max-w-full sm:max-w-[min(100%,720px)]'
      );
    case 'large_rectangle':
      return cn(
        'relative mx-auto block w-full min-w-0 overflow-hidden',
        ASPECT_SLOT,
        'max-w-full sm:max-w-[min(100%,960px)]'
      );
    case 'skyscraper':
      return cn(
        'relative mx-auto block w-full min-w-0 overflow-hidden',
        ASPECT_SLOT,
        'max-w-[min(100%,300px)] sm:max-w-[min(100%,400px)]'
      );
    case 'wide_skyscraper':
      return cn(
        'relative mx-auto block w-full min-w-0 overflow-hidden',
        ASPECT_SLOT,
        'max-w-[min(100%,340px)] sm:max-w-[min(100%,480px)]'
      );
    default:
      return marketingBannerViewportClassName('leaderboard');
  }
}

/** Homepage hero: slightly wider cap on large screens. */
export function marketingBannerHeroViewportClassName(format: MarketingBannerCreativeFormat): string {
  const f = normalizeMarketingBannerCreativeFormat(format);
  switch (f) {
    case 'leaderboard':
      return cn(
        'relative mx-auto block w-full min-w-0 overflow-hidden',
        ASPECT_SLOT,
        'max-w-full sm:max-w-[min(100%,min(1200px,96vw))]'
      );
    case 'mobile_banner':
      return cn(
        'relative mx-auto block w-full min-w-0 overflow-hidden',
        ASPECT_SLOT,
        'max-w-full sm:max-w-[min(100%,min(1200px,96vw))]'
      );
    default:
      return marketingBannerViewportClassName(f);
  }
}

export function marketingBannerLoadingSkeletonClassName(format: MarketingBannerCreativeFormat): string {
  const f = normalizeMarketingBannerCreativeFormat(format);
  switch (f) {
    case 'leaderboard':
    case 'mobile_banner':
      return cn('w-full max-w-full sm:max-w-[min(100%,960px)]', ASPECT_SLOT);
    case 'medium_rectangle':
      return cn('w-full max-w-full sm:max-w-[min(100%,720px)]', ASPECT_SLOT);
    case 'large_rectangle':
      return cn('w-full max-w-full sm:max-w-[min(100%,960px)]', ASPECT_SLOT);
    case 'skyscraper':
      return cn('w-full max-w-[min(100%,300px)] sm:max-w-[min(100%,400px)]', ASPECT_SLOT);
    case 'wide_skyscraper':
      return cn('w-full max-w-[min(100%,340px)] sm:max-w-[min(100%,480px)]', ASPECT_SLOT);
    default:
      return marketingBannerLoadingSkeletonClassName('leaderboard');
  }
}

export function marketingBannerHeroLoadingSkeletonClassName(format: MarketingBannerCreativeFormat): string {
  const f = normalizeMarketingBannerCreativeFormat(format);
  if (f === 'leaderboard' || f === 'mobile_banner') {
    return cn('w-full max-w-full sm:max-w-[min(100%,min(1200px,96vw))]', ASPECT_SLOT);
  }
  return marketingBannerLoadingSkeletonClassName(f);
}

/** Smokers Club / dual-strip cells: full column width, same 3.65:1 slot aspect. */
export function marketingBannerStripSlotClassName(format: MarketingBannerCreativeFormat): string {
  const f = normalizeMarketingBannerCreativeFormat(format);
  switch (f) {
    case 'leaderboard':
    case 'mobile_banner':
      return cn('relative block w-full min-w-0 overflow-hidden', ASPECT_SLOT);
    case 'medium_rectangle':
    case 'large_rectangle':
    case 'skyscraper':
    case 'wide_skyscraper':
      return cn('relative block w-full min-w-0 overflow-hidden', ASPECT_SLOT);
    default:
      return marketingBannerStripSlotClassName('leaderboard');
  }
}

export function marketingBannerStripSkeletonSlotClassName(format: MarketingBannerCreativeFormat): string {
  const f = normalizeMarketingBannerCreativeFormat(format);
  switch (f) {
    case 'leaderboard':
    case 'mobile_banner':
    case 'medium_rectangle':
    case 'large_rectangle':
    case 'skyscraper':
    case 'wide_skyscraper':
      return cn('w-full', ASPECT_SLOT);
    default:
      return marketingBannerStripSkeletonSlotClassName('leaderboard');
  }
}
