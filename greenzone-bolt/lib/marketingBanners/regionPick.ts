/** Rows that participate in listing_market / ZIP area filtering. */
export type RegionScopedRow = { listing_market_id?: string | null };

/**
 * Pick slides for a shopper’s ZIP-derived **listing market** (metro), e.g. Los Angeles vs San Diego.
 *
 * **Market-specific deck wins:** If any active row targets `shopperListingMarketId`, only those rows are used
 * (so per-market clones do not stack with globals in the carousel).
 *
 * **Fallback:** No shopper market, or that market has no rows → use **global** rows (`listing_market_id` null).
 * If there are no globals either, return all `rows` (legacy / odd data).
 */
export function pickBannersForShopperListingMarket<T extends RegionScopedRow>(
  rows: T[],
  shopperListingMarketId: string | null
): T[] {
  const globals = rows.filter((r) => r.listing_market_id == null);

  if (!shopperListingMarketId) {
    return globals.length > 0 ? globals : rows;
  }

  const forMarket = rows.filter((r) => r.listing_market_id === shopperListingMarketId);
  if (forMarket.length > 0) return forMarket;
  return globals.length > 0 ? globals : rows;
}
