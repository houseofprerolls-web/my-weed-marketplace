import { extractZip5 } from '@/lib/zipUtils';

/** Shared map center + synthetic coords when DB has no lat/lng. */

export const DEFAULT_MAP_CENTER = { lat: 34.0522, lng: -118.2437 };

/** Offset a point a few hundred meters east of the anchor (default placement for a new extra map pin). */
export function offsetLatLngEastMeters(lat: number, lng: number, eastMeters = 180): { lat: number; lng: number } {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const metersPerDegLng = 111_320 * Math.max(0.25, Math.abs(cosLat));
  return { lat, lng: lng + eastMeters / metersPerDegLng };
}

/**
 * Rough map anchor for a California ZIP so synthetic jitter is not stacked on LA for every vendor.
 * (Exact coords should come from `vendors.location` / `vendors_public_coords`.)
 */
/**
 * Shopper ZIP anchor for distance sorting / map fallbacks (CA + NY + default).
 * NY prefixes must not use California centroids — otherwise Discover “nearest” strips favor CA stores.
 */
export function mapApproxCenterForShopperZip5(zip?: string | null): { lat: number; lng: number } {
  const z5 = extractZip5(typeof zip === 'string' ? zip : '') ?? '';
  if (z5.length !== 5) return DEFAULT_MAP_CENTER;
  const p = parseInt(z5.slice(0, 3), 10);
  if (p >= 100 && p <= 104) return { lat: 40.7128, lng: -74.006 };
  if (p >= 105 && p <= 115) return { lat: 41.05, lng: -73.75 };
  if (p >= 116 && p <= 125) return { lat: 42.65, lng: -73.75 };
  if (p >= 126 && p <= 137) return { lat: 42.8864, lng: -78.8784 };
  if (p >= 138 && p <= 149) return { lat: 42.45, lng: -76.5 };
  return mapCenterForCaZipOrDefault(z5);
}

export function mapCenterForCaZipOrDefault(zip?: string | null): { lat: number; lng: number } {
  const z5 = extractZip5(typeof zip === 'string' ? zip : '') ?? '';
  if (z5.length !== 5) return DEFAULT_MAP_CENTER;
  const p = parseInt(z5.slice(0, 3), 10);
  if (p < 900 || p > 961) return DEFAULT_MAP_CENTER;

  if (p <= 908) return { lat: 34.05, lng: -118.25 };
  // Inland Empire prefixes (align with market_zip_prefixes / 0221).
  if (p === 909 || p === 917 || (p >= 923 && p <= 925)) return { lat: 33.98, lng: -117.38 };
  // 922 = Coachella Valley / desert (do not use IE centroid — was skewing distance & map jitter).
  if (p === 922) return { lat: 33.82, lng: -116.47 };
  if (p <= 918) return { lat: 34.15, lng: -118.05 };
  if (p <= 921) return { lat: 32.85, lng: -117.15 };
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

export type LatLng = { lat: number; lng: number };

/**
 * After geocode / DB coords, many vendors can share an identical point (same county centroid, etc.).
 * Bucket nearby pins and lay them out on a golden-angle spiral (used only when county bbox is unknown).
 */
export function spreadOverlappingMarkerPositions(
  positions: Map<string, LatLng>,
  opts?: {
    cellSizeDeg?: number;
    baseRadiusMeters?: number;
    spreadExponent?: number;
    maxRadiusMeters?: number;
  }
): Map<string, LatLng> {
  const cell = opts?.cellSizeDeg ?? 0.00035;
  const baseM = opts?.baseRadiusMeters ?? 280;
  const spreadExp = opts?.spreadExponent ?? 0.62;
  const maxRM = opts?.maxRadiusMeters ?? 8500;
  const GOLDEN = 2.39996322972865332;

  const entries = Array.from(positions.entries()).filter(
    ([, p]) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
  );
  if (entries.length === 0) return new Map(positions);

  const groups = new Map<string, { id: string; lat: number; lng: number }[]>();
  for (const [id, p] of entries) {
    const gx = Math.floor(p.lat / cell);
    const gy = Math.floor(p.lng / cell);
    const key = `${gx},${gy}`;
    let g = groups.get(key);
    if (!g) {
      g = [];
      groups.set(key, g);
    }
    g.push({ id, lat: p.lat, lng: p.lng });
  }

  const out = new Map<string, LatLng>();
  for (const group of Array.from(groups.values())) {
    if (group.length === 1) {
      const s = group[0];
      out.set(s.id, { lat: s.lat, lng: s.lng });
      continue;
    }
    const n = group.length;
    let sumLat = 0;
    let sumLng = 0;
    for (const s of group) {
      sumLat += s.lat;
      sumLng += s.lng;
    }
    const cLat = sumLat / n;
    const cLng = sumLng / n;
    const cosLat = Math.cos((cLat * Math.PI) / 180);
    const metersPerDegLat = 111_320;
    const metersPerDegLng = 111_320 * Math.max(0.25, Math.abs(cosLat));

    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < sorted.length; i++) {
      const angle = i * GOLDEN;
      const rM = Math.min(maxRM, baseM * Math.pow(i + 1, spreadExp));
      const dLat = (rM * Math.sin(angle)) / metersPerDegLat;
      const dLng = (rM * Math.cos(angle)) / metersPerDegLng;
      out.set(sorted[i].id, { lat: cLat + dLat, lng: cLng + dLng });
    }
  }

  return out;
}
