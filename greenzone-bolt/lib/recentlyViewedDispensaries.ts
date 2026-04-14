const STORAGE_KEY = 'datreehouse:recent_dispensaries';
const MAX_IDS = 32;

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return [];
    return a.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

/** Persist a listing view (most recent first). No-op on server. */
export function recordDispensaryView(vendorId: string): void {
  if (typeof window === 'undefined' || !vendorId) return;
  try {
    const prev = parseIds(localStorage.getItem(STORAGE_KEY));
    const next = [vendorId, ...prev.filter((id) => id !== vendorId)].slice(0, MAX_IDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('datreehouse:recent-dispensary'));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readRecentlyViewedDispensaryIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseIds(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}
