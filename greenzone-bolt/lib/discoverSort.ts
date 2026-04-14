import { zipProximityRank } from '@/lib/zipUtils';

export type GeoPoint = { lat: number; lng: number };

export type DiscoverSortRow = {
  id: string;
  zip?: string | null;
  smokers_club_eligible?: boolean;
  geo_lat?: number | null;
  geo_lng?: number | null;
  /** Extra map pins from `vendor_locations` (primary stays geo_lat/geo_lng). */
  map_geo_extra_points?: ReadonlyArray<GeoPoint> | null;
};

export type DiscoverSortContext = {
  treehouseRank: Map<string, number>;
  approvedForMarket: Set<string>;
  shopperZip5: string | null;
  /** Vendors with `vendor_delivery_zip5` for the current shopper ZIP5. */
  vendorIdsServingShopperZip: Set<string>;
  shopperLat: number | null;
  shopperLng: number | null;
  /** Vendors with any map pin within the public 15mi radius of the shopper anchor (live + approved). */
  withinPinRadiusVendorIds: Set<string>;
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Primary pin plus optional extra `vendor_locations` pins (dedupes invalid primaries). */
export function collectVendorMapGeoPoints(
  primary: { lat?: number | null; lng?: number | null },
  extras?: ReadonlyArray<GeoPoint> | null | undefined
): GeoPoint[] {
  const out: GeoPoint[] = [];
  if (
    primary.lat != null &&
    primary.lng != null &&
    Number.isFinite(primary.lat) &&
    Number.isFinite(primary.lng)
  ) {
    out.push({ lat: primary.lat, lng: primary.lng });
  }
  for (const p of extras ?? []) {
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      out.push({ lat: p.lat, lng: p.lng });
    }
  }
  return out;
}

/** Shortest great-circle distance in km from shopper to any of the vendor’s map points. */
export function minHaversineKmFromShopper(
  shopperLat: number,
  shopperLng: number,
  points: readonly GeoPoint[]
): number | undefined {
  if (points.length === 0) return undefined;
  return Math.min(...points.map((p) => haversineKm(shopperLat, shopperLng, p.lat, p.lng)));
}

export function minHaversineMilesFromShopper(
  shopperLat: number,
  shopperLng: number,
  points: readonly GeoPoint[]
): number | undefined {
  const km = minHaversineKmFromShopper(shopperLat, shopperLng, points);
  return km != null ? km * 0.621371 : undefined;
}

export function discoverTier(v: DiscoverSortRow, ctx: DiscoverSortContext): number {
  if (ctx.treehouseRank.has(v.id)) return 0;
  // Smokers Club–eligible shops share the same “area OK” tier as explicit market approval (no double requirement).
  if (
    v.smokers_club_eligible ||
    ctx.approvedForMarket.has(v.id) ||
    ctx.withinPinRadiusVendorIds.has(v.id)
  ) {
    return 1;
  }
  return 2;
}

export function compareDiscoverVendors(a: DiscoverSortRow, b: DiscoverSortRow, ctx: DiscoverSortContext): number {
  const ta = discoverTier(a, ctx);
  const tb = discoverTier(b, ctx);
  if (ta !== tb) return ta - tb;

  if (ta === 0) {
    const ra = ctx.treehouseRank.get(a.id) ?? 99;
    const rb = ctx.treehouseRank.get(b.id) ?? 99;
    if (ra !== rb) return ra - rb;
  }

  const geoOk = ctx.shopperLat != null && ctx.shopperLng != null;
  if (geoOk) {
    const ptsA = collectVendorMapGeoPoints({ lat: a.geo_lat, lng: a.geo_lng }, a.map_geo_extra_points);
    const ptsB = collectVendorMapGeoPoints({ lat: b.geo_lat, lng: b.geo_lng }, b.map_geo_extra_points);
    const da = minHaversineKmFromShopper(ctx.shopperLat!, ctx.shopperLng!, ptsA) ?? Number.POSITIVE_INFINITY;
    const db = minHaversineKmFromShopper(ctx.shopperLat!, ctx.shopperLng!, ptsB) ?? Number.POSITIVE_INFINITY;
    if (da !== db) {
      if (da === Number.POSITIVE_INFINITY) return 1;
      if (db === Number.POSITIVE_INFINITY) return -1;
      return da - db;
    }
  }

  const za = zipProximityRank(ctx.shopperZip5, a.zip);
  const zb = zipProximityRank(ctx.shopperZip5, b.zip);
  if (za !== zb) return za - zb;
  return a.id.localeCompare(b.id);
}

export function sortDiscoverVendors<T extends DiscoverSortRow>(rows: T[], ctx: DiscoverSortContext): T[] {
  return [...rows].sort((a, b) => compareDiscoverVendors(a, b, ctx));
}
