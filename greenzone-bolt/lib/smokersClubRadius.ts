import { collectVendorMapGeoPoints, haversineKm, minHaversineMilesFromShopper } from '@/lib/discoverSort';
import type { PublicVendorCard } from '@/lib/vendorDeliveryList';
import type { VendorShopperAreaFields } from '@/lib/vendorShopperArea';
import { vendorLiveLicenseApproved } from '@/lib/vendorShopperArea';
import {
  vendorPassesShopperMarketGate,
  type VendorShopperAreaGateCtx,
} from '@/lib/vendorShopperArea';

/** Primary competition disk (admin pins only count when premise/delivery is inside this). */
export const SMOKERS_CLUB_PRIMARY_RADIUS_MI = 15;

/** Backfill expands outward until empty tree slots are fillable or cap reached. */
export const SMOKERS_CLUB_RADIUS_STEPS_MI = [15, 20, 25, 35, 50] as const;

export const SMOKERS_CLUB_MAX_RADIUS_MI =
  SMOKERS_CLUB_RADIUS_STEPS_MI[SMOKERS_CLUB_RADIUS_STEPS_MI.length - 1];

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 0.621371;
}

export function vendorPremiseMilesFromAnchor(
  v: Pick<PublicVendorCard, 'geo_lat' | 'geo_lng'>,
  anchor: { lat: number; lng: number }
): number | null {
  const lat = v.geo_lat;
  const lng = v.geo_lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return haversineMiles(anchor.lat, anchor.lng, lat, lng);
}

/** Shortest miles from anchor to primary + extra map pins (extras when present on `v`). */
export function vendorNearestMapPinMilesFromAnchor(
  v: Pick<PublicVendorCard, 'geo_lat' | 'geo_lng' | 'map_geo_extra_points'>,
  anchor: { lat: number; lng: number }
): number | null {
  const pts = collectVendorMapGeoPoints(
    { lat: v.geo_lat ?? null, lng: v.geo_lng ?? null },
    v.map_geo_extra_points
  );
  if (pts.length === 0) return null;
  return minHaversineMilesFromShopper(anchor.lat, anchor.lng, pts) ?? null;
}

/**
 * Option A (Smokers Club): in **geoMode**, listing-market premise alignment is not required.
 * Candidate passes if live + (ops or `smokers_club_eligible`) + (delivery ZIP row OR within `maxMiles` with coords).
 */
export function vendorPassesSmokersClubRadiusGate(
  v: PublicVendorCard & VendorShopperAreaFields,
  approvedIds: Set<string>,
  gateCtx: VendorShopperAreaGateCtx,
  geoMode: boolean,
  anchor: { lat: number; lng: number } | null,
  maxMiles: number
): boolean {
  if (geoMode && anchor) {
    if (!vendorLiveLicenseApproved(v)) return false;
    const z = gateCtx.shopperZip5 && gateCtx.shopperZip5.length === 5 ? gateCtx.shopperZip5 : null;
    const servesShopperZip = z ? gateCtx.vendorIdsServingShopperZip?.has(v.id) === true : false;
    const miles = vendorNearestMapPinMilesFromAnchor(v, anchor);
    const within = miles != null && miles <= maxMiles;
    if (!servesShopperZip && !within) return false;
    if (approvedIds.has(v.id)) return true;
    return v.smokers_club_eligible === true;
  }
  return vendorPassesShopperMarketGate(v, approvedIds, false, gateCtx);
}

/** Admin / QA pin: only shown when vendor is within primary miles of anchor OR delivery-ZIP override (same as competition). */
export function vendorEligibleForSmokersClubPinAtAnchor(
  v: PublicVendorCard,
  approvedIds: Set<string>,
  gateCtx: VendorShopperAreaGateCtx,
  anchor: { lat: number; lng: number } | null,
  geoMode: boolean
): boolean {
  return vendorPassesSmokersClubRadiusGate(
    v as PublicVendorCard & VendorShopperAreaFields,
    approvedIds,
    gateCtx,
    geoMode,
    anchor,
    SMOKERS_CLUB_PRIMARY_RADIUS_MI
  );
}

/**
 * Smallest `maxMiles` in `SMOKERS_CLUB_RADIUS_STEPS_MI` such that enough candidates exist to fill `needCount` slots,
 * or the final cap step if still short.
 */
export function resolveSmokersClubBackfillRadiusMiles(
  candidates: PublicVendorCard[],
  needCount: number,
  approvedIds: Set<string>,
  gateCtx: VendorShopperAreaGateCtx,
  geoMode: boolean,
  anchor: { lat: number; lng: number } | null
): number {
  if (!geoMode || !anchor) return SMOKERS_CLUB_PRIMARY_RADIUS_MI;
  for (const miles of SMOKERS_CLUB_RADIUS_STEPS_MI) {
    const n = candidates.filter((c) =>
      vendorPassesSmokersClubRadiusGate(
        c as PublicVendorCard & VendorShopperAreaFields,
        approvedIds,
        gateCtx,
        true,
        anchor,
        miles
      )
    ).length;
    if (n >= needCount) return miles;
  }
  return SMOKERS_CLUB_RADIUS_STEPS_MI[SMOKERS_CLUB_RADIUS_STEPS_MI.length - 1];
}
