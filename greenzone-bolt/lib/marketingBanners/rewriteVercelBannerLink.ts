import { getSiteUrl } from '@/lib/siteUrl';

/**
 * Marketing slide `link_url` values were sometimes saved as full Vercel deployment URLs.
 * Rewrite any http(s) URL whose host ends in `.vercel.app` to the canonical site origin
 * (`NEXT_PUBLIC_SITE_URL`, default https://www.datreehouse.com), preserving path, query, and hash.
 */
export function rewriteVercelAppBannerClickUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (!/^https?:$/i.test(u.protocol)) return t;
    if (!u.hostname.toLowerCase().endsWith('.vercel.app')) return t;
    const base = getSiteUrl().replace(/\/$/, '');
    return `${base}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return t;
  }
}
