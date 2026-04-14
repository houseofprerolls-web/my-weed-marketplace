import type { SiteBannerRow } from '@/lib/siteBanners';

/** Static creatives copied to `public/marketing-ad-demos/` (Green Haven, Shango, STIIIZY, Uncle Green’s, Super Fresh Farms). */
const DEMO_IMAGE_PATHS = [
  '/marketing-ad-demos/01-green-haven.png',
  '/marketing-ad-demos/02-shango.png',
  '/marketing-ad-demos/03-stiiizy.png',
  '/marketing-ad-demos/04-uncle-greens.png',
  '/marketing-ad-demos/05-super-fresh-farms.png',
] as const;

function hashPlacement(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Deterministic shuffle so each `placement_key` gets a different order, stable across reloads. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed >>> 0;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function marketingAdDemoEnabled(): boolean {
  if (typeof process === 'undefined') return false;
  const v = (process.env.NEXT_PUBLIC_MARKETING_AD_DEMO || '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  return false;
}

/**
 * Synthetic slides for UI review: same five images, different order per placement.
 * Enable with `NEXT_PUBLIC_MARKETING_AD_DEMO=1` (or `true` / `yes`). Does not run by default in dev.
 */
export function buildMarketingAdPreviewSlides(placementKey: string): SiteBannerRow[] {
  const seed = hashPlacement(placementKey);
  const urls = seededShuffle([...DEMO_IMAGE_PATHS], seed);
  const now = new Date().toISOString();
  return urls.map((image_url, i) => ({
    id: `ad-preview-${placementKey}-${i}`,
    vendor_id: null,
    placement_key: placementKey,
    title: `Preview ${i + 1}`,
    image_url,
    link_url: '/discover',
    status: 'active',
    admin_note: null,
    created_at: now,
    updated_at: now,
    listing_market_id: null,
    creative_format: 'leaderboard',
  }));
}
