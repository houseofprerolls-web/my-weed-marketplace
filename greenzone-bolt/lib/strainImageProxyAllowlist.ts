/**
 * Hosts allowed for `/api/strain-image-proxy` (canvas white→alpha needs same-origin or this proxy).
 */

export function isAllowedStrainImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (process.env.NODE_ENV === 'development' && (h === 'localhost' || h === '127.0.0.1')) {
    return true;
  }
  if (h.endsWith('.leafly.com') || h === 'leafly.com') return true;
  if (h.endsWith('.supabase.co')) return true;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (base) {
    try {
      if (new URL(base).hostname.toLowerCase() === h) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
