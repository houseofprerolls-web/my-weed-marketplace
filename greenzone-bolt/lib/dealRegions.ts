import { US_STATE_OPTIONS } from '@/lib/usStates';

const STATE_NAME_TO_CODE = new Map<string, string>(
  US_STATE_OPTIONS.flatMap((s) => {
    const c = s.code.toUpperCase();
    return [
      [c, c],
      [s.name.toUpperCase(), c],
    ];
  })
);

/** Normalize stored state text to a 2-letter code when possible. */
export function normalizeUsStateCode(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim().toUpperCase();
  if (!t) return '';
  if (t.length === 2) return t;
  return STATE_NAME_TO_CODE.get(t) ?? t.slice(0, 2);
}

/** Empty or missing region_keys on a *stored* deal = after DB trigger 0130, expanded to vendor-active states. */
export function dealAppliesToStoreRegion(
  regionKeys: string[] | null | undefined,
  vendorState: string | null | undefined
): boolean {
  const keys = (regionKeys ?? [])
    .map((k) => normalizeUsStateCode(String(k)))
    .filter((k) => k.length === 2);
  if (keys.length === 0) return true;
  const vs = normalizeUsStateCode(vendorState);
  if (!vs) return true;
  return keys.includes(vs);
}

/**
 * Deals page region dropdown: match selected state (e.g. CA) to deal regions and vendor location.
 * - Explicit region_keys: show if the filter state is included (supports full names or 2-letter codes).
 * - Empty region_keys: treat as statewide for that vendor — show only if the vendor's state matches the filter.
 */
export function dealMatchesRegionDropdownFilter(
  regionKeys: string[] | null | undefined,
  vendorState: string | null | undefined,
  filterCode: string
): boolean {
  if (filterCode === 'all') return true;
  const f = normalizeUsStateCode(filterCode);
  if (f.length !== 2) return true;
  const keys = (regionKeys ?? [])
    .map((k) => normalizeUsStateCode(String(k)))
    .filter((k) => k.length === 2);
  const vs = normalizeUsStateCode(vendorState);
  if (keys.length === 0) {
    return !vs || vs === f;
  }
  return keys.includes(f);
}

export function formatDealRegionLabel(regionKeys: string[] | null | undefined): string {
  const keys = (regionKeys ?? []).map((k) => String(k).trim().toUpperCase()).filter(Boolean);
  if (keys.length === 0) return 'All regions';
  if (keys.length <= 3) return keys.join(', ');
  return `${keys.slice(0, 3).join(', ')} +${keys.length - 3}`;
}

/**
 * Human label for deal listing areas (listing_markets.slug) when we have optional display names.
 */
export function formatDealListingMarketsLabel(
  slugs: string[] | null | undefined,
  nameBySlug?: Map<string, string>
): string {
  const raw = (slugs ?? []).map((s) => String(s).trim()).filter(Boolean);
  if (raw.length === 0) return 'All listing areas';
  const labels = raw.map((slug) => nameBySlug?.get(slug) ?? slug.replace(/-/g, ' '));
  if (labels.length <= 2) return labels.join(', ');
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
}

/**
 * Marketplace / Discover: deal visible for shopper's listing market (ZIP-derived) when set.
 * If deal has listing_market_slugs, shopper market slug must match.
 * Otherwise fall back to state-style region_keys + vendor state (legacy).
 */
export function dealAppliesToShopperListingMarket(
  listingMarketSlugs: string[] | null | undefined,
  regionKeys: string[] | null | undefined,
  vendorState: string | null | undefined,
  shopperMarketSlug: string | null | undefined,
  shopperMarketRegionKey: string | null | undefined
): boolean {
  const slugs = (listingMarketSlugs ?? [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);
  if (slugs.length > 0) {
    if (!shopperMarketSlug) return false;
    return slugs.includes(shopperMarketSlug.trim().toLowerCase());
  }
  if (shopperMarketRegionKey && String(shopperMarketRegionKey).trim()) {
    const code = normalizeUsStateCode(shopperMarketRegionKey);
    if (code.length === 2) {
      return dealMatchesRegionDropdownFilter(regionKeys, vendorState, code);
    }
  }
  return dealAppliesToStoreRegion(regionKeys, vendorState);
}
