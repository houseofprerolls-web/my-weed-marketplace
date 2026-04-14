/** Empty or missing region_keys on a deal = runs in all regions. */
export function dealAppliesToStoreRegion(
  regionKeys: string[] | null | undefined,
  vendorState: string | null | undefined
): boolean {
  const keys = (regionKeys ?? [])
    .map((k) => String(k).trim().toUpperCase())
    .filter((k) => k.length > 0);
  if (keys.length === 0) return true;
  const vs = String(vendorState ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (!vs) return true;
  return keys.includes(vs);
}

export function formatDealRegionLabel(regionKeys: string[] | null | undefined): string {
  const keys = (regionKeys ?? []).map((k) => String(k).trim().toUpperCase()).filter(Boolean);
  if (keys.length === 0) return 'All regions';
  if (keys.length <= 3) return keys.join(', ');
  return `${keys.slice(0, 3).join(', ')} +${keys.length - 3}`;
}
