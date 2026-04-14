/** Deals created within this window appear in the “New deals” strip (48h). */
export const MARKETPLACE_DEAL_NEW_MS = 48 * 60 * 60 * 1000;

export type MarketplaceDealRankRow = {
  id: string;
  marketplace_featured_rank?: number | null;
  deal_click_count?: number | null;
  created_at?: string | null;
};

export function compareMarketplaceDeals<T extends MarketplaceDealRankRow>(a: T, b: T): number {
  const ra = a.marketplace_featured_rank;
  const rb = b.marketplace_featured_rank;
  const ha = ra != null && Number.isFinite(Number(ra));
  const hb = rb != null && Number.isFinite(Number(rb));
  if (ha && hb && Number(ra) !== Number(rb)) return Number(ra) - Number(rb);
  if (ha && !hb) return -1;
  if (!ha && hb) return 1;
  const ca = Number(a.deal_click_count ?? 0);
  const cb = Number(b.deal_click_count ?? 0);
  if (ca !== cb) return cb - ca;
  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
  return tb - ta;
}

export function rankMarketplaceDeals<T extends MarketplaceDealRankRow>(deals: T[]): T[] {
  return [...deals].sort(compareMarketplaceDeals);
}

/** Featured admin slots first (by rank), then highest clicks, up to totalCap unique deals. */
export function buildMarketplaceFeaturedStrip<T extends MarketplaceDealRankRow & { id: string }>(
  deals: T[],
  totalCap: number
): T[] {
  const ranked = rankMarketplaceDeals(deals);
  const featured = ranked.filter((d) => d.marketplace_featured_rank != null);
  const rest = ranked.filter((d) => d.marketplace_featured_rank == null);
  const out: T[] = [];
  const seen = new Set<string>();
  for (const d of featured) {
    if (out.length >= totalCap) break;
    if (!seen.has(d.id)) {
      out.push(d);
      seen.add(d.id);
    }
  }
  for (const d of rest) {
    if (out.length >= totalCap) break;
    if (!seen.has(d.id)) {
      out.push(d);
      seen.add(d.id);
    }
  }
  return out;
}

export function filterNewMarketplaceDeals<T extends { created_at?: string | null }>(
  deals: T[],
  nowMs: number = Date.now()
): T[] {
  const cutoff = nowMs - MARKETPLACE_DEAL_NEW_MS;
  return deals.filter((d) => {
    const t = d.created_at ? new Date(d.created_at).getTime() : 0;
    return Number.isFinite(t) && t >= cutoff;
  });
}
