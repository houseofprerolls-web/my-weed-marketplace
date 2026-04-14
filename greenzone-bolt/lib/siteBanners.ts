import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { listingHrefForVendor } from '@/lib/listingPath';
import {
  normalizeMarketingBannerImageUrl,
  resolveMarketingBannerImageUrl,
} from '@/lib/marketingBanners/imageUrl';
import { fetchMarketingBannerSlides } from '@/lib/marketingBanners/fetchSlides';
import { pickBannersForShopperListingMarket } from '@/lib/marketingBanners/regionPick';
import { SMOKERS_CLUB_SLOT_RANK_MAX, SMOKERS_CLUB_TREEHOUSE_LANE } from '@/lib/smokersClub';
import type { PlatformPlacementKey } from '@/lib/platformAdPlacements';
import { MARKETING_BANNER_SLOT_ASPECT_CLASS } from '@/lib/marketingBanners/creativeFormats';

export const HOMEPAGE_BANNER_PRESETS = [
  { value: 'wide_banner', label: 'Wide cinematic', hint: '21:9 — optional ultra-wide hero' },
  { value: 'hero_strip', label: 'Hero strip', hint: 'Legacy label — live slots use 1235×338 (≈3.65:1)' },
  { value: 'square_tile', label: 'Square tile', hint: '1:1 — card style' },
  { value: 'tall_sidebar', label: 'Tall spotlight', hint: '3:5 — vertical poster' },
  { value: 'leaderboard', label: 'Standard banner', hint: '1235×338 ≈3.65:1 wide banner (default)' },
] as const;

export type HomepageBannerPreset = (typeof HOMEPAGE_BANNER_PRESETS)[number]['value'];

export type SiteBannerStatus = 'pending' | 'active' | 'rejected' | 'archived';

export type SiteBannerRow = {
  id: string;
  vendor_id: string | null;
  vendor_slug?: string | null;
  placement_key?: PlatformPlacementKey | string;
  title?: string | null;
  image_url: string;
  link_url: string | null;
  status: SiteBannerStatus;
  admin_note: string | null;
  created_at: string;
  updated_at?: string | null;
  listing_market_id?: string | null;
  /** Carousel order within a placement (lower first). */
  sort_order?: number | null;
  /** Format / max width (see `creativeFormats.ts` — 1235×338 ≈3.65:1). */
  creative_format?: string | null;
  /** Cannabis license from `vendors.license_number` when slide is vendor-sponsored. */
  advertiser_license_number?: string | null;
};

/** @deprecated Use SiteBannerRow */
export type HomepageBannerRow = SiteBannerRow;

export const ADMIN_SITE_BANNER_SLOT_RANK = 2;

/** @deprecated Use ADMIN_SITE_BANNER_SLOT_RANK */
export const ADMIN_HOMEPAGE_BANNER_SLOT_RANK = ADMIN_SITE_BANNER_SLOT_RANK;

export function bannerKind(row: Pick<SiteBannerRow, 'vendor_id'>): 'vendor' | 'admin' {
  return row.vendor_id == null ? 'admin' : 'vendor';
}

export function slotRankForSiteBanner(row: SiteBannerRow, rankByVendor: Map<string, number>): number {
  if (bannerKind(row) === 'admin') return ADMIN_SITE_BANNER_SLOT_RANK;
  if (!row.vendor_id) return SMOKERS_CLUB_SLOT_RANK_MAX;
  return rankByVendor.get(row.vendor_id) ?? SMOKERS_CLUB_SLOT_RANK_MAX;
}

/** @deprecated Use slotRankForSiteBanner */
export const slotRankForHomepageBanner = slotRankForSiteBanner;

export function homepageBannerPresetClass(preset: string): string {
  switch (preset) {
    case 'wide_banner':
      return 'aspect-[21/9] w-full max-w-3xl sm:max-w-4xl';
    case 'hero_strip':
      return `${MARKETING_BANNER_SLOT_ASPECT_CLASS} w-full max-w-3xl sm:max-w-4xl`;
    case 'square_tile':
      return 'aspect-square w-full max-w-[160px] sm:max-w-[180px]';
    case 'tall_sidebar':
      return 'aspect-[3/5] w-full max-w-[120px] sm:max-w-[140px]';
    case 'leaderboard':
      return `${MARKETING_BANNER_SLOT_ASPECT_CLASS} w-full max-w-3xl sm:max-w-4xl`;
    default:
      return 'aspect-[21/9] w-full max-w-3xl sm:max-w-4xl';
  }
}

export async function fetchBestTreehouseSlotByVendor(vendorIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!vendorIds.length) return map;
  const { data, error } = await supabase
    .from('vendor_market_listings')
    .select('vendor_id, slot_rank')
    .in('vendor_id', vendorIds)
    .eq('club_lane', SMOKERS_CLUB_TREEHOUSE_LANE)
    .eq('active', true)
    .gte('slot_rank', 1)
    .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);
  if (error || !data) return map;
  for (const row of data as { vendor_id: string; slot_rank: number }[]) {
    const prev = map.get(row.vendor_id);
    if (prev == null || row.slot_rank < prev) map.set(row.vendor_id, row.slot_rank);
  }
  return map;
}

export function siteBannerDwellMsForSlot(slotRank: number): number {
  const r = Math.min(Math.max(slotRank, 1), SMOKERS_CLUB_SLOT_RANK_MAX);
  const base = 3200;
  const step = 650;
  return base + (SMOKERS_CLUB_SLOT_RANK_MAX + 1 - r) * step;
}

/** @deprecated Use siteBannerDwellMsForSlot */
export const homepageBannerDwellMsForSlot = siteBannerDwellMsForSlot;

export function normalizeSiteBannerImageUrl(raw: string | null | undefined): string {
  return normalizeMarketingBannerImageUrl(raw);
}

export function resolvedSiteBannerImageUrl(raw: string | null | undefined): string {
  return resolveMarketingBannerImageUrl(raw);
}

/** @deprecated Use normalizeSiteBannerImageUrl */
export const normalizeHomepageBannerImageUrl = normalizeSiteBannerImageUrl;

/** Filter active rows by shopper ZIP → listing market (see `fetchMarketingBannerSlides`). */
export function pickSiteBannersForShopperListingMarket(
  rows: SiteBannerRow[],
  shopperListingMarketId: string | null
): SiteBannerRow[] {
  return pickBannersForShopperListingMarket(rows, shopperListingMarketId);
}

export async function fetchActiveSiteBanners(
  placementKey: PlatformPlacementKey | string = 'homepage_hero',
  opts?: { shopperZip5?: string | null; supabaseClient?: SupabaseClient }
): Promise<SiteBannerRow[]> {
  const db = opts?.supabaseClient ?? supabase;
  const zip = opts?.shopperZip5 && opts.shopperZip5.length === 5 ? opts.shopperZip5 : null;
  return fetchMarketingBannerSlides(placementKey, { shopperZip5: zip, supabaseClient: db });
}

/** @deprecated Use fetchActiveSiteBanners */
export const fetchApprovedHomepageBanners = fetchActiveSiteBanners;

export function siteBannerListingHref(row: { vendor_id: string | null; vendor_slug?: string | null }): string {
  if (!row.vendor_id) return '/';
  return listingHrefForVendor({ id: row.vendor_id, slug: row.vendor_slug });
}

/** @deprecated Use siteBannerListingHref */
export const homepageBannerListingHref = siteBannerListingHref;

/** Default wide preset for previews (no DB column). */
export const DEFAULT_BANNER_PRESET: HomepageBannerPreset = 'wide_banner';
