export type SupplyBuyerListingSortRow = {
  id: string;
  catalog_product_id: string | null;
  buyer_showcase_rank?: number | null;
  created_at: string;
};

export type SupplyDealPin = {
  catalogProductId: string;
  headline: string;
  discountPercent: number | null;
};

/** Active-deal SKUs first, then optional showcase rank (ascending), then newest. */
export function sortSupplyListingsForBuyer<T extends SupplyBuyerListingSortRow>(
  rows: T[],
  dealByCatalogId: Map<string, SupplyDealPin>
): T[] {
  return [...rows].sort((a, b) => {
    const aDeal = !!(a.catalog_product_id && dealByCatalogId.has(a.catalog_product_id));
    const bDeal = !!(b.catalog_product_id && dealByCatalogId.has(b.catalog_product_id));
    if (aDeal !== bDeal) return aDeal ? -1 : 1;

    const ar = a.buyer_showcase_rank ?? null;
    const br = b.buyer_showcase_rank ?? null;
    const aFeat = ar != null && ar >= 1;
    const bFeat = br != null && br >= 1;
    if (aFeat !== bFeat) return aFeat ? -1 : 1;
    if (aFeat && bFeat && ar !== br) return (ar as number) - (br as number);

    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
  });
}
