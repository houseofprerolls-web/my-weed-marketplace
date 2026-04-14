import type { HomepageBannerPreset } from '@/lib/siteBanners';
import type { MarketingBannerCreativeFormat } from '@/lib/marketingBanners/creativeFormats';

/** Placements use a wide banner aspect — 1235×338 (≈3.65:1) — at all breakpoints. */
const SIZE_LIVE = '≈3.65:1 wide strip (1235×338 canvas)';

const CREATIVE_LEADERBOARD =
  'Export at 1235×338 (≈3.65:1) PNG/JPG. Live slots keep that aspect everywhere; keep logos and text centered. Other “formats” in admin mainly change max width or column width, not the ratio.';

/** Keys for `marketing_banner_slides.placement_key` — admin assigns slides to site surfaces. */
export const PLATFORM_AD_PLACEMENTS = [
  {
    key: 'homepage_hero',
    label: 'Homepage hero',
    hint: 'Wide banner under the main headline — changes with shopper ZIP → listing market when a slide targets a market',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'smokers_club_strip',
    label: 'Smokers Club strip',
    hint: 'Inside the homepage Smokers Club card — ZIP-targeted when a slide has a listing market',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'discover_top',
    label: 'Discover — top',
    hint: 'Below jump nav on /discover',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'discover_mid',
    label: 'Discover — mid',
    hint: 'Between curated strips and Smokers Club on /discover',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'deals',
    label: 'Deals page',
    hint: 'Above the deals grid',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'dispensaries',
    label: 'Dispensaries directory',
    hint: 'Below the directory header',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'map',
    label: 'Map page',
    hint: 'Above filters',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'feed',
    label: 'Community feed',
    hint: 'Top of /feed',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
  {
    key: 'supply_marketplace_top',
    label: 'Supply marketplace — top',
    hint: 'Above the wholesale supplier grid on /vendor/supply/directory',
    sizeMobile: SIZE_LIVE,
    sizeDesktop: SIZE_LIVE,
    ratioCreative: CREATIVE_LEADERBOARD,
    recommendedPreset: 'leaderboard' as const satisfies HomepageBannerPreset,
    defaultCreativeFormat: 'leaderboard' as const satisfies MarketingBannerCreativeFormat,
  },
] as const;

export type PlatformPlacementKey = (typeof PLATFORM_AD_PLACEMENTS)[number]['key'];

export type PlatformPlacementMeta = (typeof PLATFORM_AD_PLACEMENTS)[number];

/**
 * Admin “page” tabs: group `placement_key` values so banner queues can be browsed per surface.
 * `other` = legacy / custom keys not in {@link PLATFORM_AD_PLACEMENTS}.
 */
export const BANNER_ADMIN_PAGE_TAB_ORDER = [
  { id: 'all', label: 'All pages', placementKeys: null },
  {
    id: 'home',
    label: 'Home',
    placementKeys: ['homepage_hero', 'smokers_club_strip'] as const satisfies readonly PlatformPlacementKey[],
  },
  {
    id: 'discover',
    label: 'Discover',
    placementKeys: ['discover_top', 'discover_mid'] as const satisfies readonly PlatformPlacementKey[],
  },
  { id: 'deals', label: 'Deals', placementKeys: ['deals'] as const satisfies readonly PlatformPlacementKey[] },
  {
    id: 'dispensaries',
    label: 'Dispensaries',
    placementKeys: ['dispensaries'] as const satisfies readonly PlatformPlacementKey[],
  },
  { id: 'map', label: 'Map', placementKeys: ['map'] as const satisfies readonly PlatformPlacementKey[] },
  { id: 'feed', label: 'Feed', placementKeys: ['feed'] as const satisfies readonly PlatformPlacementKey[] },
  {
    id: 'supply',
    label: 'Supply / B2B',
    placementKeys: ['supply_marketplace_top'] as const satisfies readonly PlatformPlacementKey[],
  },
  { id: 'other', label: 'Other', placementKeys: null },
] as const;

export type BannerAdminPageTabId = (typeof BANNER_ADMIN_PAGE_TAB_ORDER)[number]['id'];

export function bannerAdminPageTabIdForPlacementKey(placementKey: string | null | undefined): BannerAdminPageTabId {
  const k = placementKey || 'homepage_hero';
  for (const tab of BANNER_ADMIN_PAGE_TAB_ORDER) {
    if (tab.id === 'all' || tab.id === 'other' || tab.placementKeys == null) continue;
    if ((tab.placementKeys as readonly string[]).includes(k)) return tab.id;
  }
  const isKnown = PLATFORM_AD_PLACEMENTS.some((p) => p.key === k);
  return isKnown ? 'other' : 'other';
}

/** Row / slide belongs to this admin page tab (for lists). */
export function bannerAdminRowMatchesPageTab(
  tabId: BannerAdminPageTabId,
  placementKey: string | null | undefined
): boolean {
  if (tabId === 'all') return true;
  const k = placementKey || 'homepage_hero';
  if (tabId === 'other') {
    return !PLATFORM_AD_PLACEMENTS.some((p) => p.key === k);
  }
  const rowTab = bannerAdminPageTabIdForPlacementKey(placementKey);
  return rowTab === tabId;
}

/** Placement slot card shown in “Add sponsored slide” for this tab. */
export function bannerAdminPageTabIncludesPlacementKey(tabId: BannerAdminPageTabId, key: string): boolean {
  if (tabId === 'all') return true;
  if (tabId === 'other') {
    return !PLATFORM_AD_PLACEMENTS.some((p) => p.key === key);
  }
  const tab = BANNER_ADMIN_PAGE_TAB_ORDER.find((t) => t.id === tabId);
  if (!tab || tab.placementKeys == null) return false;
  return (tab.placementKeys as readonly string[]).includes(key);
}

export function placementLabel(key: string): string {
  const row = PLATFORM_AD_PLACEMENTS.find((p) => p.key === key);
  return row?.label ?? key;
}

export function placementMeta(key: string): PlatformPlacementMeta | undefined {
  return PLATFORM_AD_PLACEMENTS.find((p) => p.key === key);
}

/** Default `creative_format` when a slide has none set (DB default is leaderboard). */
export function placementDefaultCreativeFormat(key: string): MarketingBannerCreativeFormat {
  return placementMeta(key)?.defaultCreativeFormat ?? 'leaderboard';
}

/** @deprecated Prefer `placementMeta(key)?.sizeMobile` / `sizeDesktop` for UI. */
export function placementRatioShort(key: string): string {
  const m = placementMeta(key);
  if (!m) return '—';
  if (m.sizeMobile === m.sizeDesktop) return m.sizeMobile;
  return `${m.sizeMobile} / ${m.sizeDesktop}`;
}

export function placementRatioCreative(key: string): string {
  return placementMeta(key)?.ratioCreative ?? '';
}

export function placementRecommendedPreset(key: string): HomepageBannerPreset {
  return placementMeta(key)?.recommendedPreset ?? 'leaderboard';
}
