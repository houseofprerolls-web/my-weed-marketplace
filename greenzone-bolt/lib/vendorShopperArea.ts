import { vendorPremiseListingMarketAlignsWithShopper } from '@/lib/listingMarketSlugFromZip5';
import { collectVendorMapGeoPoints, minHaversineMilesFromShopper } from '@/lib/discoverSort';
import { PUBLIC_DISPENSARY_NEARBY_MILES } from '@/lib/publicDispensaryVisibility';

/**
 * Aligns Smokers Club / discover / map with listing markets derived from shopper vs vendor ZIP.
 * Cross-metro visibility requires an explicit row in `vendor_delivery_zip5` for the shopper ZIP5.
 * When `shopperMapLat`/`shopperMapLng` are set, any public map pin within `PUBLIC_DISPENSARY_NEARBY_MILES`
 * (primary + `vendor_locations`) also satisfies the geographic leg (same constant as directory visibility).
 */
export type VendorShopperAreaFields = {
  id: string;
  /** Premise / primary ZIP on `vendors.zip` — used to resolve listing market. */
  zip?: string | null;
  smokers_club_eligible?: boolean | null;
  is_live?: boolean | null;
  license_status?: string | null;
  billing_delinquent?: boolean | null;
  /** Primary pin — optional; used with extras for multi-pin radius gate. */
  geo_lat?: number | null;
  geo_lng?: number | null;
  /** Extra pins from `vendor_locations`. */
  map_geo_extra_points?: ReadonlyArray<{ lat: number; lng: number }> | null;
};

export type VendorShopperAreaGateCtx = {
  shopperZip5: string | null;
  /** From `vendor_delivery_zip5`: vendors allowed to appear for this shopper ZIP despite premise mismatch. */
  vendorIdsServingShopperZip?: ReadonlySet<string> | undefined;
  /** Shopper anchor (device geo or ZIP centroid). When set with vendor coords, enables 15mi pin-radius OR. */
  shopperMapLat?: number | null;
  shopperMapLng?: number | null;
};

export type VendorShopperMarketGateOptions = {
  /**
   * When true (e.g. NY / non-CA markets), `smokers_club_eligible` alone does not pass;
   * vendor must be on the treehouse ladder or approved for the market — still subject to ZIP / coverage rules.
   */
  requireOpsOrTreehouse?: boolean;
};

export function vendorLiveLicenseApproved(v: VendorShopperAreaFields): boolean {
  return (
    v.is_live === true &&
    String(v.license_status ?? '') === 'approved' &&
    v.billing_delinquent !== true
  );
}

/** True when shopper anchor is within `maxMiles` of any vendor map pin (primary + extras). */
export function vendorWithinPublicMapPinRadiusMiles(
  v: VendorShopperAreaFields,
  ctx: VendorShopperAreaGateCtx,
  maxMiles: number = PUBLIC_DISPENSARY_NEARBY_MILES
): boolean {
  const slat = ctx.shopperMapLat;
  const slng = ctx.shopperMapLng;
  if (slat == null || slng == null || !Number.isFinite(slat) || !Number.isFinite(slng)) return false;
  const pts = collectVendorMapGeoPoints(
    { lat: v.geo_lat ?? null, lng: v.geo_lng ?? null },
    v.map_geo_extra_points
  );
  if (pts.length === 0) return false;
  const d = minHaversineMilesFromShopper(slat, slng, pts);
  return d != null && Number.isFinite(d) && d <= maxMiles;
}

export function vendorPassesShopperMarketGate(
  v: VendorShopperAreaFields,
  approvedVendorIdsForMarket: Set<string>,
  hasActiveTreehouseSlot: boolean,
  ctx: VendorShopperAreaGateCtx,
  opts?: VendorShopperMarketGateOptions
): boolean {
  if (!vendorLiveLicenseApproved(v)) return false;

  const shopperZ = ctx.shopperZip5 && ctx.shopperZip5.length === 5 ? ctx.shopperZip5 : null;
  const servesShopperZip = shopperZ ? ctx.vendorIdsServingShopperZip?.has(v.id) === true : false;
  const premiseAligns = vendorPremiseListingMarketAlignsWithShopper(shopperZ, v.zip ?? null);
  const withinPinRadius = vendorWithinPublicMapPinRadiusMiles(v, ctx);

  if (!premiseAligns && !servesShopperZip && !withinPinRadius) return false;

  if (opts?.requireOpsOrTreehouse) {
    return hasActiveTreehouseSlot || approvedVendorIdsForMarket.has(v.id);
  }

  if (hasActiveTreehouseSlot) return true;
  if (approvedVendorIdsForMarket.has(v.id)) return true;
  return v.smokers_club_eligible === true;
}
