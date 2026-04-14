/**
 * Canonical public site origin for sitemaps, robots, metadataBase, and JSON-LD.
 * Override in production with NEXT_PUBLIC_SITE_URL (no trailing slash).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.datreehouse.com';
  const u = raw.replace(/\/$/, '');
  if (!/^https?:\/\//i.test(u)) return 'https://www.datreehouse.com';
  return u;
}
