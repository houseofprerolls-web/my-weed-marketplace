/** URL slugs used on the homepage / Smokers Club category pages → `products.category` values. */

export const SMOKERS_CLUB_CATEGORY_SLUGS = [
  'flower',
  'edibles',
  'pre-rolls',
  'vapes',
  'concentrates',
  'cbd',
] as const;

export type SmokersClubCategorySlug = (typeof SMOKERS_CLUB_CATEGORY_SLUGS)[number];

export const SMOKERS_CLUB_CATEGORY_LABELS: Record<SmokersClubCategorySlug, string> = {
  flower: 'Flower',
  edibles: 'Edibles',
  'pre-rolls': 'Pre-Rolls',
  vapes: 'Vapes',
  concentrates: 'Concentrates',
  cbd: 'CBD',
};

/** Static hero / category button art under `public/smokers-club/categories/`. */
export const SMOKERS_CLUB_CATEGORY_IMAGE_PATHS: Record<SmokersClubCategorySlug, string> = {
  flower: '/smokers-club/categories/flower.png',
  edibles: '/smokers-club/categories/edibles.png',
  'pre-rolls': '/smokers-club/categories/pre-rolls.png',
  vapes: '/smokers-club/categories/vapes.png',
  concentrates: '/smokers-club/categories/concentrates.png',
  cbd: '/smokers-club/categories/cbd.png',
};

/** Focal point for `object-fit: cover` circular crops (percent / keyword). */
export const SMOKERS_CLUB_CATEGORY_IMAGE_OBJECT_POSITION: Partial<
  Record<SmokersClubCategorySlug, string>
> = {
  'pre-rolls': '44% 50%',
  edibles: '38% 50%',
  cbd: '58% 48%',
  concentrates: '50% 42%',
};

export function isSmokersClubCategorySlug(s: string): s is SmokersClubCategorySlug {
  return (SMOKERS_CLUB_CATEGORY_SLUGS as readonly string[]).includes(s);
}

/** Resolves URL slug for category pages. */
export function resolveSmokersClubCategorySlug(s: string): SmokersClubCategorySlug | null {
  if (isSmokersClubCategorySlug(s)) return s;
  return null;
}

/** DB `products.category` values for RPC + filtering (CBD maps loosely to topical/other). */
export function dbCategoriesForSlug(slug: SmokersClubCategorySlug): string[] {
  switch (slug) {
    case 'flower':
      return ['flower'];
    case 'edibles':
      return ['edible'];
    case 'pre-rolls':
      return ['preroll'];
    case 'vapes':
      return ['vape'];
    case 'concentrates':
      return ['concentrate'];
    case 'cbd':
      return ['topical', 'other'];
    default:
      return [];
  }
}

export function productMatchesSmokersClubCategory(
  slug: SmokersClubCategorySlug,
  row: { category: string; potency_cbd?: number | null; name?: string | null }
): boolean {
  if (slug === 'cbd') {
    const cats = dbCategoriesForSlug('cbd');
    if (cats.includes(row.category)) return true;
    const cbd = row.potency_cbd;
    if (cbd != null && Number.isFinite(Number(cbd)) && Number(cbd) > 0) return true;
    const n = (row.name || '').toLowerCase();
    return /\bcbd\b/.test(n);
  }
  return dbCategoriesForSlug(slug).includes(row.category);
}

export const SMOKERS_CLUB_DELIVERY_RADIUS_MI = 40;
export const SMOKERS_CLUB_PICKUP_RADIUS_MI = 40;

export function milesFromKm(km: number): number {
  return km * 0.621371;
}
