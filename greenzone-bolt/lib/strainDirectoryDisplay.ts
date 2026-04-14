/** Strain directory cards: photo flag from DB (hero URL / sort helper). */
export function strainRowHasCatalogPhoto(row: {
  has_hero_image?: boolean | null;
  image_url?: string | null;
}): boolean {
  if (row.has_hero_image === true) return true;
  const u = row.image_url?.trim();
  return !!u;
}

/**
 * When a strain is catalogued with a photo, show a stable pseudo-random review
 * count so cards are not tied to imported totals. Same slug always maps to the same number.
 */
export function displayStrainReviewCountForPhotoCard(
  slug: string,
  row: { has_hero_image?: boolean | null; image_url?: string | null },
  actualCount: number
): number {
  if (!strainRowHasCatalogPhoto(row)) return Math.max(0, Math.floor(Number(actualCount)) || 0);
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) | 0;
  }
  const u = Math.abs(h);
  const min = 14;
  const max = 502;
  return min + (u % (max - min + 1));
}

type StrainRatingRow = { has_hero_image?: boolean | null; image_url?: string | null };

/**
 * Average shown on cards: real DB rating when present; catalog-photo strains without a rating get a
 * stable per-slug value; otherwise 4.5 when the encyclopedia has no score yet.
 */
export function strainDisplayAverageRating(
  slug: string,
  row: StrainRatingRow,
  actualRating: number | null | undefined
): number {
  const n = Number(actualRating);
  if (Number.isFinite(n) && n > 0 && n <= 5) {
    return Math.min(5, Math.max(1, n));
  }
  if (strainRowHasCatalogPhoto(row)) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) {
      h = (h * 31 + slug.charCodeAt(i)) | 0;
    }
    const u = Math.abs(h);
    const steps = 18;
    return Math.round((4.1 + (u % (steps + 1)) * 0.05) * 10) / 10;
  }
  return 4.5;
}
