export type SkuCardPreset = 'default' | 'dark_glass' | 'forest' | 'ember' | 'custom';

const PRESET_SET = new Set<string>(['default', 'dark_glass', 'forest', 'ember', 'custom']);

export function normalizeSkuCardPreset(raw: string | null | undefined): SkuCardPreset {
  const s = String(raw ?? 'default')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return PRESET_SET.has(s) ? (s as SkuCardPreset) : 'default';
}

export function clampSkuCardOverlay(raw: number | null | undefined): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 50;
  return Math.min(85, Math.max(0, n));
}

export type VendorSkuCardThemeInput = {
  preset?: string | null;
  backgroundUrl?: string | null;
  overlayOpacity?: number | null;
};

/** Row slice for resolving store card theme (Discover, VendorCard, Smokers Club shops). */
export type VendorStoreListingCardRow = {
  sku_card_preset?: string | null;
  sku_card_background_url?: string | null;
  sku_card_overlay_opacity?: number | null;
  store_listing_card_preset?: string | null;
  store_listing_card_background_url?: string | null;
  store_listing_card_overlay_opacity?: number | null;
};

/**
 * Store/discover cards: dedicated `store_listing_card_*` when preset is set; otherwise same as menu SKU theme.
 */
export function resolveStoreListingCardTheme(
  row: VendorStoreListingCardRow | null | undefined
): ResolvedSkuCardTheme {
  if (!row) return resolveSkuCardTheme(null);
  const dedicated =
    row.store_listing_card_preset != null && String(row.store_listing_card_preset).trim() !== '';
  if (!dedicated) {
    return resolveSkuCardTheme({
      preset: row.sku_card_preset,
      backgroundUrl: row.sku_card_background_url,
      overlayOpacity: row.sku_card_overlay_opacity,
    });
  }
  const storeBg = String(row.store_listing_card_background_url ?? '').trim();
  const skuBg = String(row.sku_card_background_url ?? '').trim();
  const mergedBg = storeBg || skuBg || null;
  const storeOp = row.store_listing_card_overlay_opacity;
  const mergedOp =
    storeOp != null && Number.isFinite(Number(storeOp)) ? storeOp : row.sku_card_overlay_opacity;
  return resolveSkuCardTheme({
    preset: row.store_listing_card_preset,
    backgroundUrl: mergedBg,
    overlayOpacity: mergedOp,
  });
}

export function resolveSkuCardTheme(input: VendorSkuCardThemeInput | null | undefined): {
  preset: SkuCardPreset;
  backgroundUrl: string | null;
  overlayOpacity: number;
} {
  const preset = normalizeSkuCardPreset(input?.preset);
  const url = String(input?.backgroundUrl ?? '').trim() || null;
  const overlay = clampSkuCardOverlay(input?.overlayOpacity);
  if (preset === 'custom' && !url) {
    return { preset: 'default', backgroundUrl: null, overlayOpacity: 50 };
  }
  return {
    preset: preset === 'custom' ? 'custom' : preset,
    backgroundUrl: url,
    overlayOpacity: overlay,
  };
}

export type ResolvedSkuCardTheme = ReturnType<typeof resolveSkuCardTheme>;

export function skuCardPresetShellClass(preset: SkuCardPreset): string {
  switch (preset) {
    case 'dark_glass':
      return 'border-white/15 bg-white/[0.06] backdrop-blur-md shadow-lg shadow-black/25';
    case 'forest':
      return 'border-emerald-800/40 bg-gradient-to-br from-emerald-950/95 via-gray-950 to-black';
    case 'ember':
      return 'border-orange-900/45 bg-gradient-to-br from-orange-950/90 via-gray-950 to-black';
    case 'custom':
      return 'border-emerald-800/30 bg-gray-950';
    case 'default':
    default:
      return 'border-green-900/25 bg-gradient-to-br from-gray-900 to-black';
  }
}
