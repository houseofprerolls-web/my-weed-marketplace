/**
 * Which discovery vendors have a deal that is live right now with a daily time window (happy hour style).
 * Returns empty when none, on error, or non-OK response — no badges should show.
 */
export async function fetchHappyHourVendorIdsForDiscover(vendorIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(vendorIds.filter(Boolean)));
  if (ids.length === 0 || typeof window === 'undefined') return new Set();

  try {
    const u = new URL('/api/public/happy-hour-vendors', window.location.origin);
    u.searchParams.set('vendor_ids', ids.join(','));
    const res = await fetch(u.toString());
    if (!res.ok) return new Set();

    const j = (await res.json().catch(() => ({}))) as { vendorIds?: unknown };
    const arr = j.vendorIds;
    if (!Array.isArray(arr) || arr.length === 0) return new Set();

    return new Set(arr.filter((x): x is string => typeof x === 'string' && x.length > 0));
  } catch {
    return new Set();
  }
}
