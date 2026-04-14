/** Preset keys stored in `product_quantity_tiers.preset` (matches DB check constraint). */
export const QUANTITY_TIER_PRESETS = ['3_5g', '7g', '14g', '28g', 'custom'] as const;
export type QuantityTierPreset = (typeof QUANTITY_TIER_PRESETS)[number];

export const QUANTITY_TIER_PRESET_LABELS: Record<QuantityTierPreset, string> = {
  '3_5g': '3.5 g',
  '7g': '7 g',
  '14g': '14 g',
  '28g': '28 g',
  custom: 'Custom',
};

export function defaultLabelForPreset(preset: string): string {
  if (preset === '3_5g' || preset === '7g' || preset === '14g' || preset === '28g' || preset === 'custom') {
    return QUANTITY_TIER_PRESET_LABELS[preset];
  }
  return 'Custom';
}

export function isQuantityTierPreset(s: string): s is QuantityTierPreset {
  return (QUANTITY_TIER_PRESETS as readonly string[]).includes(s);
}
