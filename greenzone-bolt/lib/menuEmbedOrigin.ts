/** Max storefront origins per vendor (see migration vendor_menu_embed_origins). */
export const MENU_EMBED_ORIGIN_MAX = 5;

/**
 * Normalize user input to `https://host` or `https://host:port` (no path, query, or fragment).
 * Returns null when invalid or non-HTTPS.
 */
export function normalizeMenuEmbedOrigin(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (u.pathname !== '/' && u.pathname !== '') return null;
  if (u.search || u.hash) return null;
  const host = u.hostname.toLowerCase();
  if (!host) return null;
  return `https://${host}${u.port ? `:${u.port}` : ''}`;
}
