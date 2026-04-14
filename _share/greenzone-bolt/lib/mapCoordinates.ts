import { extractZip5 } from '@/lib/zipUtils';

/** Shared map center + synthetic coords when DB has no lat/lng. */

export const DEFAULT_MAP_CENTER = { lat: 34.0522, lng: -118.2437 };

/**
 * Rough map anchor for a California ZIP so synthetic jitter is not stacked on LA for every vendor.
 * (Exact coords should come from `vendors.location` / `vendors_public_coords`.)
 */
export function mapCenterForCaZipOrDefault(zip?: string | null): { lat: number; lng: number } {
  const z5 = extractZip5(typeof zip === 'string' ? zip : '') ?? '';
  if (z5.length !== 5) return DEFAULT_MAP_CENTER;
  const p = parseInt(z5.slice(0, 3), 10);
  if (p < 900 || p > 961) return DEFAULT_MAP_CENTER;

  if (p <= 908) return { lat: 34.05, lng: -118.25 };
  if (p <= 918) return { lat: 34.15, lng: -118.05 };
  if (p <= 921) return { lat: 32.85, lng: -117.15 };
  if (p <= 925) return { lat: 33.98, lng: -117.38 };
  if (p <= 928) return { lat: 33.75, lng: -117.87 };
  if (p <= 934) return { lat: 34.65, lng: -120.45 };
  if (p <= 936) return { lat: 35.37, lng: -119.02 };
  if (p <= 938) return { lat: 36.74, lng: -119.77 };
  if (p === 939) return { lat: 36.68, lng: -121.66 };
  if (p === 940) return { lat: 37.55, lng: -122.32 };
  if (p === 941) return { lat: 37.77, lng: -122.42 };
  if (p <= 945) return { lat: 37.8, lng: -122.12 };
  if (p <= 948) return { lat: 37.8, lng: -122.27 };
  if (p === 949) return { lat: 38.04, lng: -122.55 };
  if (p <= 951) return { lat: 37.34, lng: -121.89 };
  if (p <= 953) return { lat: 37.79, lng: -121.22 };
  if (p <= 955) return { lat: 38.44, lng: -122.71 };
  if (p === 956) return { lat: 38.58, lng: -121.01 };
  if (p <= 958) return { lat: 38.58, lng: -121.49 };
  if (p === 959) return { lat: 39.73, lng: -121.84 };
  if (p <= 961) return { lat: 40.59, lng: -122.39 };
  return DEFAULT_MAP_CENTER;
}

export function hashJitter(
  id: string,
  zip: string | undefined,
  center: { lat: number; lng: number }
): { lat: number; lng: number } {
  let h = 2166136261;
  const s = id + (zip || "");
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const dx = (((h >>> 0) % 180) / 1800 - 0.05) * 1.2;
  const dy = ((((h >>> 10) % 180) / 1800 - 0.05) * 0.9) / Math.cos((center.lat * Math.PI) / 180);
  return { lat: center.lat + dy, lng: center.lng + dx };
}
