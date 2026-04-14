/** List price on `products.price_cents`; optional `sale_discount_percent` (1–99) reduces shopper price. */
export function effectiveSalePriceCents(
  listPriceCents: number,
  saleDiscountPercent: number | null | undefined
): number | null {
  if (saleDiscountPercent == null || !Number.isFinite(Number(saleDiscountPercent))) return null;
  const p = Math.round(Number(saleDiscountPercent));
  if (p < 1 || p > 99) return null;
  return Math.max(0, Math.round(listPriceCents * (1 - p / 100)));
}

/**
 * Shelf sale: either percent off or fixed cents off list (DB enforces at most one set).
 * Returns the lower shopper price, or null when no valid discount applies.
 */
export function effectiveShelfSalePriceCents(
  listPriceCents: number,
  saleDiscountPercent: number | null | undefined,
  saleDiscountCents: number | null | undefined
): number | null {
  const pct = effectiveSalePriceCents(listPriceCents, saleDiscountPercent);
  let fixed: number | null = null;
  if (saleDiscountCents != null && Number.isFinite(Number(saleDiscountCents))) {
    const off = Math.round(Number(saleDiscountCents));
    if (off >= 1) fixed = Math.max(0, listPriceCents - off);
  }
  const candidates = [pct, fixed].filter((x): x is number => x != null && x < listPriceCents);
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}
