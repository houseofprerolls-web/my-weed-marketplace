import { listingMarketSlugFromZip5 } from '@/lib/listingMarketSlugFromZip5';

/**
 * After every Smokers Club storefront in a listing market, add up to this many
 * delivery-only pins (red on the map). Hybrid storefront+delivery rows stay in the storefront set
 * and render as the violet “both” pin.
 */
export const SMOKERS_CLUB_MAP_DELIVERY_EXTRAS_PER_MARKET = 5;

export type MapPinFameFields = {
  id: string;
  offers_delivery: boolean;
  offers_storefront: boolean;
  total_reviews: number;
  average_rating: number;
  active_deals_count: number;
  featured_until?: string | null;
  zip_code: string;
};

function fameScore(b: MapPinFameFields): number {
  const feat =
    b.featured_until && new Date(b.featured_until).getTime() > Date.now() ? 45 : 0;
  return (
    (Number(b.total_reviews) || 0) * 3 +
    (Number(b.average_rating) || 0) * 18 +
    (Number(b.active_deals_count) || 0) * 2 +
    feat
  );
}

function isDeliveryOnlyLane(b: MapPinFameFields): boolean {
  return Boolean(b.offers_delivery) && !b.offers_storefront;
}

function byFameThenId(a: MapPinFameFields, b: MapPinFameFields): number {
  const d = fameScore(b) - fameScore(a);
  if (d !== 0) return d;
  return a.id.localeCompare(b.id);
}

/**
 * Per listing market (ZIP5 → slug): every Smokers Club vendor with `offers_storefront`, then up to
 * `maxDeliveryExtrasPerMarket` delivery-only vendors, highest signal first (reviews, rating, deals, featured).
 */
export function buildSmokersClubMapPinsPerMarket<T extends MapPinFameFields>(
  vendors: T[],
  maxDeliveryExtrasPerMarket = SMOKERS_CLUB_MAP_DELIVERY_EXTRAS_PER_MARKET
): T[] {
  const byMarket = new Map<string, T[]>();
  for (const v of vendors) {
    const m = listingMarketSlugFromZip5(v.zip_code) ?? 'other';
    let arr = byMarket.get(m);
    if (!arr) {
      arr = [];
      byMarket.set(m, arr);
    }
    arr.push(v);
  }

  const out: T[] = [];
  for (const [, list] of Array.from(byMarket.entries())) {
    const storefronts = list.filter((b) => Boolean(b.offers_storefront)).sort(byFameThenId);
    const seen = new Set(storefronts.map((s) => s.id));

    const deliveryExtras = list
      .filter(isDeliveryOnlyLane)
      .sort(byFameThenId)
      .filter((d) => !seen.has(d.id))
      .slice(0, maxDeliveryExtrasPerMarket);

    out.push(...storefronts, ...deliveryExtras);
  }
  return out;
}
