/** Safe href for vendor website / external CTAs (Smokers Club, store cards). */
export function normalizeVendorWebsiteUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  return `https://${s}`;
}
