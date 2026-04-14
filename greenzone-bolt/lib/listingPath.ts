/**
 * Public listing URLs: prefer stable vendor `slug` (readable) over UUID; legacy UUIDs still resolve.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVendorListingUuid(segment: string): boolean {
  return UUID_RE.test(String(segment ?? '').trim());
}

/** Path segment only (no leading slash). */
export function listingPathSegmentForVendor(v: {
  id: string;
  slug?: string | null;
}): string {
  const slug = typeof v.slug === 'string' ? v.slug.trim() : '';
  if (slug.length > 0) return slug;
  return String(v.id).trim();
}

/** Full href e.g. `/listing/my-dispensary` */
export function listingHrefForVendor(v: { id: string; slug?: string | null }): string {
  return `/listing/${encodeURIComponent(listingPathSegmentForVendor(v))}`;
}
