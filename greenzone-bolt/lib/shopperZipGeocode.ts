/**
 * Geocode the shopper's saved ZIP5 for distance sorting when browser geolocation is off.
 * Cached in localStorage (same session as map geocode cache pattern).
 */

import { extractZip5 } from '@/lib/zipUtils';
import { mapApproxCenterForShopperZip5 } from '@/lib/mapCoordinates';
import { mapboxGeocodeAddress, mapboxTokenForGeocode } from '@/lib/mapGeocode';

const CACHE_PREFIX = 'gz:shopper_zip_geo:v1:';

function cacheKey(zip5: string): string {
  return CACHE_PREFIX + zip5;
}

export function readCachedShopperZipPoint(zip5: string): { lat: number; lng: number } | null {
  if (typeof window === 'undefined') return null;
  const z = extractZip5(zip5);
  if (!z || z.length !== 5) return null;
  try {
    const raw = localStorage.getItem(cacheKey(z));
    if (!raw) return null;
    const j = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    const lat = Number(j.lat);
    const lng = Number(j.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedShopperZipPoint(zip5: string, pt: { lat: number; lng: number }): void {
  if (typeof window === 'undefined') return;
  const z = extractZip5(zip5);
  if (!z || z.length !== 5) return;
  try {
    localStorage.setItem(cacheKey(z), JSON.stringify(pt));
  } catch {
    /* quota */
  }
}

/**
 * Best-effort point for "distance from shopper" when device geo is unavailable.
 * Order: localStorage cache → Mapbox geocode of ZIP5 → regional ZIP centroid.
 */
export async function resolveShopperPointForDistance(zipRaw: string | null | undefined): Promise<{
  lat: number;
  lng: number;
  source: 'cache' | 'geocode' | 'centroid';
}> {
  const zip5 = extractZip5(zipRaw ?? '') ?? '';
  if (zip5.length !== 5) {
    const c = mapApproxCenterForShopperZip5(null);
    return { ...c, source: 'centroid' };
  }

  const cached = readCachedShopperZipPoint(zip5);
  if (cached) return { ...cached, source: 'cache' };

  const token = mapboxTokenForGeocode();
  if (token) {
    const q = `${zip5}, United States`;
    const pt = await mapboxGeocodeAddress(q, token);
    if (pt) {
      writeCachedShopperZipPoint(zip5, pt);
      return { ...pt, source: 'geocode' };
    }
  }

  const c = mapApproxCenterForShopperZip5(zip5);
  return { ...c, source: 'centroid' };
}
