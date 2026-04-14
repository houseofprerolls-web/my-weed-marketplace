import type { DiscoveryVendor } from '@/lib/publicVendors';
import { vendorLiveLicenseApproved, vendorPassesShopperMarketGate } from '@/lib/vendorShopperArea';

export const DISCOVER_STRIP_LIMIT = 7;

export type DiscoverStripGateOptions = {
  /**
   * When true (e.g. NY / non-CA listing markets), only vendors approved for this market or on its
   * treehouse ladder — not every nationwide `smokers_club_eligible` row.
   */
  requireMarketOpsOrTree?: boolean;
  shopperZip5?: string | null;
  vendorIdsServingShopperZip?: ReadonlySet<string>;
  /** Device geo or ZIP centroid — enables 15mi multi-pin OR in `vendorPassesShopperMarketGate`. */
  shopperMapLat?: number | null;
  shopperMapLng?: number | null;
  /** Active `vendor_market_listings` strip slots for this market — bypass ZIP / pin-radius for strip only. */
  adminPinnedVendorIds?: ReadonlySet<string>;
};

export function passesDiscoverStripGate(
  v: DiscoveryVendor,
  approvedForMarket: Set<string>,
  treehouseRank: Map<string, number>,
  opts?: DiscoverStripGateOptions
): boolean {
  const r = treehouseRank.get(v.id);
  const hasTree = r != null && r >= 1 && r <= 7;
  const zip = v.zip ?? v.zip_code ?? null;
  const fields = {
    id: v.id,
    zip,
    smokers_club_eligible: v.smokers_club_eligible,
    is_live: v.is_live,
    license_status: v.license_status,
    billing_delinquent: v.billing_delinquent,
    geo_lat: v.geo_lat,
    geo_lng: v.geo_lng,
    map_geo_extra_points: v.map_geo_extra_points,
  };
  if (!vendorLiveLicenseApproved(fields)) return false;
  if (opts?.adminPinnedVendorIds?.has(v.id)) return true;

  return vendorPassesShopperMarketGate(
    fields,
    approvedForMarket,
    hasTree,
    {
      shopperZip5: opts?.shopperZip5 ?? null,
      vendorIdsServingShopperZip: opts?.vendorIdsServingShopperZip,
      shopperMapLat: opts?.shopperMapLat ?? null,
      shopperMapLng: opts?.shopperMapLng ?? null,
    },
    { requireOpsOrTreehouse: opts?.requireMarketOpsOrTree === true }
  );
}

/**
 * Admin-ordered vendor ids for a lane, then backfill open slots with the **closest map pins** first
 * (haversine miles via `distanceMi`), then menu / promos as tiebreakers.
 * Only vendors matching `laneFilter` are used — never cross-fill delivery with storefront shops.
 * `excludeVendorIds`: e.g. shops already shown on the other Discover strip.
 */
export function resolveDiscoverStripVendors(
  orderedIds: string[],
  vendorsById: Map<string, DiscoveryVendor>,
  approvedForMarket: Set<string>,
  treehouseRank: Map<string, number>,
  laneFilter: (v: DiscoveryVendor) => boolean,
  backfillPool: DiscoveryVendor[],
  clubPinIdSet: Set<string>,
  distanceMi?: (v: DiscoveryVendor) => number | undefined,
  limit = DISCOVER_STRIP_LIMIT,
  stripGateOpts?: DiscoverStripGateOptions,
  excludeVendorIds?: ReadonlySet<string>
): DiscoveryVendor[] {
  const reserved = excludeVendorIds ?? new Set<string>();
  const out: DiscoveryVendor[] = [];
  const seen = new Set<string>();

  const passes = (v: DiscoveryVendor) =>
    !seen.has(v.id) &&
    !reserved.has(v.id) &&
    passesDiscoverStripGate(v, approvedForMarket, treehouseRank, stripGateOpts);

  for (const id of orderedIds) {
    if (out.length >= limit) break;
    if (reserved.has(id)) continue;
    const v = vendorsById.get(id);
    if (!v || seen.has(id)) continue;
    if (!laneFilter(v)) continue;
    if (!passesDiscoverStripGate(v, approvedForMarket, treehouseRank, stripGateOpts)) continue;
    seen.add(id);
    out.push(v);
  }

  if (out.length >= limit) return out;

  const need = limit - out.length;
  const stage1 = backfillPool.filter((v) => laneFilter(v) && passes(v));
  out.push(...rankBackfill(stage1, clubPinIdSet, distanceMi).slice(0, need));

  return out;
}

function featuredScore(v: DiscoveryVendor, clubPinIds: Set<string>): number {
  let s = 0;
  if (clubPinIds.has(v.id)) s += 5000;
  if (v.featured_until && new Date(v.featured_until) > new Date()) s += 3000;
  if (v.promoted_until && new Date(v.promoted_until) > new Date()) s += 2000;
  s += (v.average_rating || 0) * 100;
  s += Math.min(v.total_reviews || 0, 500) * 0.5;
  s += Math.min(v.active_deals_count || 0, 20) * 10;
  return s;
}

function safeDistanceMi(v: DiscoveryVendor, distanceMi?: (v: DiscoveryVendor) => number | undefined): number {
  const d = distanceMi?.(v);
  return d != null && Number.isFinite(d) && d >= 0 ? d : Infinity;
}

/** Open slots: closest customer pin first, then menu and promos. */
function rankBackfill(
  pool: DiscoveryVendor[],
  clubPinIdSet: Set<string>,
  distanceMi?: (v: DiscoveryVendor) => number | undefined
): DiscoveryVendor[] {
  return [...pool].sort((a, b) => {
    const ad = safeDistanceMi(a, distanceMi);
    const bd = safeDistanceMi(b, distanceMi);
    if (ad !== bd) return ad - bd;

    const am = a.online_menu_enabled === true;
    const bm = b.online_menu_enabled === true;
    if (am !== bm) return am ? -1 : 1;

    const as = featuredScore(a, clubPinIdSet);
    const bs = featuredScore(b, clubPinIdSet);
    if (as !== bs) return bs - as;

    return a.business_name.localeCompare(b.business_name, undefined, { sensitivity: 'base' });
  });
}
