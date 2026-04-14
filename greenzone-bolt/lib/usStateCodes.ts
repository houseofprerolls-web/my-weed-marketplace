/** Supply ↔ vendor coverage using CA `listing_markets.slug` (same regions as the site map), not US states. */

export type SupplyCoverageKind = 'unset' | 'overlap' | 'none';

/**
 * Compare vendor approved CA listing market slugs to supplier `service_listing_market_slugs`.
 * Optional `nameBySlug` turns slugs into display names on the badge.
 */
export function supplyCoverageBadge(
  vendorMarketSlugs: string[],
  supplierMarketSlugs: string[] | null | undefined,
  nameBySlug?: Map<string, string>
): { kind: SupplyCoverageKind; label: string } {
  const s = supplierMarketSlugs ?? [];
  if (s.length === 0) return { kind: 'unset', label: 'Coverage not set' };
  const vSet = new Set(vendorMarketSlugs.map((x) => String(x).toLowerCase()));
  const overlap = s.map((x) => String(x).toLowerCase()).filter((x) => vSet.has(x));
  if (overlap.length) {
    const labels = overlap.map((slug) => nameBySlug?.get(slug.toLowerCase()) ?? slug);
    const uniq = Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (uniq.length <= 2) return { kind: 'overlap', label: `Serves ${uniq.join(' · ')}` };
    return { kind: 'overlap', label: `Serves ${uniq.slice(0, 2).join(' · ')} +${uniq.length - 2}` };
  }
  return { kind: 'none', label: 'Outside your approved CA areas' };
}

export function normalizeListingMarketSlugs(raw: string[]): string[] {
  const out = new Set<string>();
  for (const r of raw) {
    const s = String(r).trim().toLowerCase().replace(/\s+/g, '-');
    if (s) out.add(s);
  }
  return Array.from(out).sort();
}
