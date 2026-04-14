import type { DiscoveryVendor } from '@/lib/publicVendors';
import type { DiscoverSortContext } from '@/lib/discoverSort';
import { collectVendorMapGeoPoints, minHaversineKmFromShopper } from '@/lib/discoverSort';
import { zipProximityRank } from '@/lib/zipUtils';

export type DiscoverSortMode =
  | 'best-match'
  | 'distance'
  | 'highest-rated'
  | 'most-popular'
  | 'newest';

/** Trophy tiers 1–3 get the strongest weights; priority 4 = on tree; other values minimal. */
export function weightForTreehouseSlotRank(priority: number): number {
  const r = Math.round(priority);
  if (r === 1) return 400;
  if (r === 2) return 280;
  if (r === 3) return 180;
  if (r === 4) return 80;
  return Math.max(1, 50 - r);
}

function weightedPickOne<T>(pool: T[], getWeight: (t: T) => number): T | null {
  if (pool.length === 0) return null;
  let total = 0;
  const weights = pool.map((t) => {
    const w = Math.max(1, getWeight(t));
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Up to two distinct vendors from pool, weighted by Smokers Club tree slot rank (1–10). */
export function pickWeightedClubPair(
  candidates: DiscoveryVendor[],
  treehouseRank: Map<string, number>
): DiscoveryVendor[] {
  const pool = [...candidates];
  const first = weightedPickOne(pool, (v) => weightForTreehouseSlotRank(treehouseRank.get(v.id) ?? 99));
  if (!first) return [];
  const rest = pool.filter((v) => v.id !== first.id);
  const second = weightedPickOne(rest, (v) => weightForTreehouseSlotRank(treehouseRank.get(v.id) ?? 99));
  return second ? [first, second] : [first];
}

function sortTailByDistance(rest: DiscoveryVendor[], ctx: DiscoverSortContext): void {
  const geoOk = ctx.shopperLat != null && ctx.shopperLng != null;
  const distKm = (v: DiscoveryVendor) => {
    if (!geoOk) return Number.POSITIVE_INFINITY;
    const pts = collectVendorMapGeoPoints(
      { lat: v.geo_lat, lng: v.geo_lng },
      v.map_geo_extra_points
    );
    return minHaversineKmFromShopper(ctx.shopperLat!, ctx.shopperLng!, pts) ?? Number.POSITIVE_INFINITY;
  };
  rest.sort((a, b) => {
    const da = distKm(a);
    const db = distKm(b);
    if (da !== db) {
      if (da === Number.POSITIVE_INFINITY) return 1;
      if (db === Number.POSITIVE_INFINITY) return -1;
      return da - db;
    }
    const za = zipProximityRank(ctx.shopperZip5, a.zip);
    const zb = zipProximityRank(ctx.shopperZip5, b.zip);
    if (za !== zb) return za - zb;
    return a.business_name.localeCompare(b.business_name);
  });
}

/** Sort a list in place (distance / rating / etc.) — no Smokers Club pin priority. */
export function sortDiscoverTail(
  rest: DiscoveryVendor[],
  ctx: DiscoverSortContext,
  sortBy: DiscoverSortMode
): void {
  switch (sortBy) {
    case 'best-match':
    case 'distance':
      sortTailByDistance(rest, ctx);
      break;
    case 'highest-rated':
      rest.sort(
        (a, b) => b.average_rating - a.average_rating || a.business_name.localeCompare(b.business_name)
      );
      break;
    case 'most-popular':
      rest.sort(
        (a, b) => b.total_reviews - a.total_reviews || a.business_name.localeCompare(b.business_name)
      );
      break;
    case 'newest':
      rest.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
          a.business_name.localeCompare(b.business_name)
      );
      break;
    default:
      sortTailByDistance(rest, ctx);
  }
}

/**
 * `pinned` is usually up to two Smokers Club tree placements, chosen once per market/load.
 * Rows in `pinned` that are absent from `filtered` are dropped; tail is sorted by distance / sort mode.
 */
export function orderDiscoverWithPinnedFirst(
  pinned: DiscoveryVendor[],
  filtered: DiscoveryVendor[],
  ctx: DiscoverSortContext,
  sortBy: DiscoverSortMode
): DiscoveryVendor[] {
  const pinIds = new Set(pinned.map((p) => p.id));
  const pinsPresent = pinned.filter((p) => filtered.some((f) => f.id === p.id));
  const rest = filtered.filter((f) => !pinIds.has(f.id));
  sortDiscoverTail(rest, ctx, sortBy);
  return [...pinsPresent, ...rest];
}
