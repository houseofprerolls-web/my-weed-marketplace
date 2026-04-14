/** Aligns with 0051_vendor_menu_pos_profiles.sql */

export type MenuSourceMode = 'manual' | 'pos' | 'hybrid';

export type VendorMenuProfileRow = {
  id: string;
  vendor_id: string;
  region_key: string;
  label: string;
  is_master: boolean;
};

export function normalizeMenuRegionKey(state: string | null | undefined): string {
  return String(state ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 8);
}

/** Prefer exact region match, then master flag, then DEFAULT profile. */
export function pickMenuProfileId(
  profiles: Pick<VendorMenuProfileRow, 'id' | 'region_key' | 'is_master'>[],
  vendorState: string | null | undefined
): string | null {
  if (!profiles.length) return null;
  const st = normalizeMenuRegionKey(vendorState);
  if (st) {
    const hit = profiles.find((p) => p.region_key.trim().toUpperCase() === st);
    if (hit) return hit.id;
  }
  const master = profiles.find((p) => p.is_master);
  if (master) return master.id;
  const def = profiles.find((p) => p.region_key.trim().toUpperCase() === 'DEFAULT');
  return def?.id ?? null;
}

export type ProductWithPos = {
  id: string;
  pos_provider?: string | null;
  pos_external_id?: string | null;
};

export function filterProductsByMenuSource<T extends ProductWithPos>(
  items: T[],
  mode: MenuSourceMode,
  hiddenIds: Set<string>
): T[] {
  const visible = items.filter((p) => !hiddenIds.has(p.id));
  if (mode === 'pos') {
    return visible.filter((p) => Boolean(p.pos_external_id && p.pos_provider));
  }
  if (mode === 'manual' || mode === 'hybrid') {
    return visible;
  }
  return visible;
}
