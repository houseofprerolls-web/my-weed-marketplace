import type { MenuProductCategory } from '@/lib/pos/types';

const ALLOWED = new Set<MenuProductCategory>([
  'flower',
  'edible',
  'vape',
  'concentrate',
  'topical',
  'preroll',
  'other',
]);

/** Map free-text POS category labels to `products.category` enum values. */
export function mapPosCategoryLabel(raw: string | null | undefined): MenuProductCategory {
  const s = (raw ?? '').toLowerCase().trim();
  if (!s) return 'other';

  if (ALLOWED.has(s as MenuProductCategory)) return s as MenuProductCategory;

  if (/\b(flower|bud|nug)\b/.test(s)) return 'flower';
  if (/\b(preroll|pre-roll|joint|infused preroll)\b/.test(s)) return 'preroll';
  if (/\b(edible|gumm|chocolate|beverage|drink)\b/.test(s)) return 'edible';
  if (/\b(vape|cartridge|cart|disposable)\b/.test(s)) return 'vape';
  if (/\b(concentrate|wax|shatter|rosin|live resin|badder|crumble|diamond)\b/.test(s)) return 'concentrate';
  if (/\b(topical|balm|lotion|patch)\b/.test(s)) return 'topical';

  return 'other';
}
