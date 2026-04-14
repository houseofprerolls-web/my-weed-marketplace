import { zipProximityRank } from '@/lib/zipUtils';

export type DiscoverSortRow = {
  id: string;
  zip?: string | null;
  smokers_club_eligible?: boolean;
  geo_lat?: number | null;
  geo_lng?: number | null;
};

export type DiscoverSortContext = {
  treehouseRank: Map<string, number>;
  approvedForMarket: Set<string>;
  shopperZip5: string | null;
  shopperLat: number | null;
  shopperLng: number | null;
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

export function discoverTier(v: DiscoverSortRow, ctx: DiscoverSortContext): number {
  if (ctx.treehouseRank.has(v.id)) return 0;
  if (v.smokers_club_eligible && ctx.approvedForMarket.has(v.id)) return 1;
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
    const da =
      a.geo_lat != null && a.geo_lng != null
        ? haversineKm(ctx.shopperLat!, ctx.shopperLng!, a.geo_lat, a.geo_lng)
        : Number.POSITIVE_INFINITY;
    const db =
      b.geo_lat != null && b.geo_lng != null
        ? haversineKm(ctx.shopperLat!, ctx.shopperLng!, b.geo_lat, b.geo_lng)
        : Number.POSITIVE_INFINITY;
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
