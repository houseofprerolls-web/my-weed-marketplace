export type B2bListingRow = {
  id: string;
  title_override: string | null;
  catalog_product_id: string | null;
  /** PostgREST may return object or single-element array for embedded FKs */
  catalog_products?: { name: string } | { name: string }[] | null;
};

export function b2bListingTitle(row: B2bListingRow): string {
  const cp = row.catalog_products;
  const cpOne = Array.isArray(cp) ? cp[0] : cp;
  const fromCatalog = cpOne?.name?.trim();
  if (fromCatalog) return fromCatalog;
  const o = row.title_override?.trim();
  if (o) return o;
  return 'Listing';
}
