/**
 * Approximate axis-aligned bounds (WGS84) for California counties that appear in ULS / directory seeds.
 * Used only for **map pin layout** (spread within county); not legal boundaries.
 * Source of truth: [`data/ca-county-map-bounds.json`](../data/ca-county-map-bounds.json) (also read by relayout script).
 */
import rawBounds from '../data/ca-county-map-bounds.json';

export type CountyLatLngBounds = { south: number; west: number; north: number; east: number };

/** Lookup key: lowercase trimmed county name without "County" suffix (e.g. "san mateo"). */
export const CA_COUNTY_MAP_BOUNDS = rawBounds as Record<string, CountyLatLngBounds>;

export function normalizeCountyLookupKey(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Parses `vendors.city` values like "Sacramento County" → "Sacramento" for CA directory rows.
 */
export function premiseCountyNameFromVendorCity(city: string | null | undefined): string | null {
  const t = String(city ?? '').trim();
  const m = t.match(/^(.+?)\s+County$/i);
  if (!m) return null;
  const inner = m[1].trim();
  return inner.length > 0 ? inner : null;
}

export function boundsForCaliforniaCountyName(name: string | null | undefined): CountyLatLngBounds | null {
  if (!name) return null;
  const k = normalizeCountyLookupKey(name);
  return CA_COUNTY_MAP_BOUNDS[k] ?? null;
}
