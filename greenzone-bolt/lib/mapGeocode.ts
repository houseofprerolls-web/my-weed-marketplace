/**
 * Resolve map pin positions from vendor profile addresses via Mapbox forward geocode.
 * Cached in sessionStorage per normalized query to limit API usage on repeat visits.
 */

import type { DiscoveryVendor } from '@/lib/publicVendors';
import { layoutVendorPinsWithCountyBounds } from '@/lib/countyQuasiPinLayout';

/** Minimal row for address → pin geocode (directory, map, etc.). */
export type VendorGeocodeRow = {
  id: string;
  address?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  zip_code?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
};

const CACHE_PREFIX = 'gz:mapgeo:v1:';

/** Build a US geocoding query from directory fields (vendors.address / city / state / zip). */
export function vendorProfileGeocodeQuery(v: {
  address?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  /** vendor_profiles-style column */
  zip_code?: string | null;
}): string | null {
  const city = String(v.city ?? '').trim();
  const state = String(v.state ?? '').trim().slice(0, 2).toUpperCase();
  const zipRaw = String(v.zip ?? v.zip_code ?? '').replace(/\D/g, '');
  const zip = zipRaw.length >= 5 ? zipRaw.slice(0, 5) : '';
  const street = String(v.address ?? '').trim();
  if (!city || !state) return null;
  if (street) return `${street}, ${city}, ${state} ${zip}`.trim();
  if (zip.length === 5) return `${city}, ${state} ${zip}`;
  return `${city}, ${state}`;
}

function cacheKey(query: string): string {
  let h = 2166136261;
  const t = query.toLowerCase().trim();
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return CACHE_PREFIX + (h >>> 0).toString(36);
}

export function readMapGeocodeCache(query: string): { lat: number; lng: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(query));
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

function writeMapGeocodeCache(query: string, pt: { lat: number; lng: number }): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(cacheKey(query), JSON.stringify(pt));
  } catch {
    /* quota */
  }
}

export function mapboxTokenForGeocode(): string {
  return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    : ''
  ).trim();
}

export async function mapboxGeocodeAddress(
  query: string,
  accessToken: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&country=US&types=address,place,postcode,locality,neighborhood&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { center?: [number, number] }[] };
  const f = data.features?.[0];
  if (!f?.center || !Array.isArray(f.center) || f.center.length < 2) return null;
  const lng = Number(f.center[0]);
  const lat = Number(f.center[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * For each vendor: geocoded profile address (when token + address query exists), else DB coords, else jitter.
 * Shared by map page and dispensary directory distance/pins.
 */
export async function batchResolveVendorGeocodePositions(
  vendors: VendorGeocodeRow[],
  getJitterFallback: (v: VendorGeocodeRow) => { lat: number; lng: number }
): Promise<Map<string, { lat: number; lng: number }>> {
  const out = new Map<string, { lat: number; lng: number }>();
  const token = mapboxTokenForGeocode();

  const vendorsByQuery = new Map<string, string[]>();
  const queriesToFetch: string[] = [];

  if (token) {
    for (const v of vendors) {
      const q = vendorProfileGeocodeQuery(v);
      if (!q) continue;
      const cached = readMapGeocodeCache(q);
      if (cached) {
        out.set(v.id, cached);
        continue;
      }
      if (!vendorsByQuery.has(q)) {
        vendorsByQuery.set(q, []);
        queriesToFetch.push(q);
      }
      vendorsByQuery.get(q)!.push(v.id);
    }

    const CONCURRENCY = 4;
    for (let i = 0; i < queriesToFetch.length; i += CONCURRENCY) {
      const chunk = queriesToFetch.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (q) => {
          const pt = await mapboxGeocodeAddress(q, token);
          if (pt) {
            writeMapGeocodeCache(q, pt);
            for (const id of vendorsByQuery.get(q) ?? []) {
              out.set(id, pt);
            }
          }
        })
      );
    }
  }

  for (const v of vendors) {
    if (out.has(v.id)) continue;
    const dbLat = v.geo_lat;
    const dbLng = v.geo_lng;
    if (
      dbLat != null &&
      dbLng != null &&
      Number.isFinite(dbLat) &&
      Number.isFinite(dbLng)
    ) {
      out.set(v.id, { lat: dbLat, lng: dbLng });
      continue;
    }
    out.set(v.id, getJitterFallback(v));
  }

  return layoutVendorPinsWithCountyBounds(out, vendors);
}

export async function batchResolveVendorMapPositions(
  vendors: DiscoveryVendor[],
  getJitterFallback: (v: DiscoveryVendor) => { lat: number; lng: number }
): Promise<Map<string, { lat: number; lng: number }>> {
  return batchResolveVendorGeocodePositions(vendors, (v) => getJitterFallback(v as DiscoveryVendor));
}
