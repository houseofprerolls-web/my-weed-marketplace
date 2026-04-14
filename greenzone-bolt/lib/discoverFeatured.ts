import type { DiscoveryVendor } from '@/lib/publicVendors';

/** Pick up to `limit` featured stores for carousel (hand-picked ladder + rating + promos). */
export function pickFeaturedStores(
  orderedList: DiscoveryVendor[],
  clubPinIds: Set<string>,
  limit = 8
): DiscoveryVendor[] {
  if (orderedList.length === 0) return [];

  const score = (v: DiscoveryVendor) => {
    let s = 0;
    if (clubPinIds.has(v.id)) s += 5000;
    if (v.featured_until && new Date(v.featured_until) > new Date()) s += 3000;
    if (v.promoted_until && new Date(v.promoted_until) > new Date()) s += 2000;
    s += v.average_rating * 100;
    s += Math.min(v.total_reviews, 500) * 0.5;
    s += Math.min(v.active_deals_count, 20) * 10;
    return s;
  };

  const seen = new Set<string>();
  const out: DiscoveryVendor[] = [];

  const pushUnique = (v: DiscoveryVendor) => {
    if (seen.has(v.id) || out.length >= limit) return;
    seen.add(v.id);
    out.push(v);
  };

  for (const v of orderedList) {
    if (clubPinIds.has(v.id)) pushUnique(v);
  }

  const rest = [...orderedList].sort((a, b) => score(b) - score(a));
  for (const v of rest) {
    pushUnique(v);
    if (out.length >= limit) break;
  }

  return out;
}
