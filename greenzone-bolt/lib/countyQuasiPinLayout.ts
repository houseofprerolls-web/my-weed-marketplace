import {
  boundsForCaliforniaCountyName,
  CA_COUNTY_MAP_BOUNDS,
  normalizeCountyLookupKey,
  premiseCountyNameFromVendorCity,
  type CountyLatLngBounds,
} from '@/lib/caCountyMapBounds';
import { spreadOverlappingMarkerPositions, type LatLng } from '@/lib/mapCoordinates';

/** Halton sequence in [0, 1) for low-discrepancy 2D scatter (bases coprime). */
function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

function insetBoundingBox(bbox: CountyLatLngBounds): { s: number; n: number; w: number; e: number } {
  const padLat = (bbox.north - bbox.south) * 0.05;
  const padLng = (bbox.east - bbox.west) * 0.05;
  return {
    s: bbox.south + padLat,
    n: bbox.north - padLat,
    w: bbox.west + padLng,
    e: bbox.east - padLng,
  };
}

function clampLatLngToInset(ll: LatLng, box: { s: number; n: number; w: number; e: number }): LatLng {
  return {
    lat: Math.min(box.n, Math.max(box.s, ll.lat)),
    lng: Math.min(box.e, Math.max(box.w, ll.lng)),
  };
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/**
 * Quasi-random blob inside county bbox (Halton 2,3). Blob grows modestly with stack size so large
 * counties stay readable without a rigid grid.
 */
export function quasiRandomLatLngInBoundingBox(ids: string[], bbox: CountyLatLngBounds): Map<string, LatLng> {
  const out = new Map<string, LatLng>();
  const num = ids.length;
  if (num === 0) return out;

  const blobFrac = Math.min(0.27, 0.14 + Math.sqrt(Math.max(num, 1)) * 0.0095);

  const { s, n, w, e } = insetBoundingBox(bbox);
  const latSpan = Math.max(n - s, 1e-6);
  const lngSpan = Math.max(e - w, 1e-6);
  const anchorLat = (s + n) / 2;
  const anchorLng = (w + e) / 2;
  const minSpan = Math.min(latSpan, lngSpan);
  const halfLat = (blobFrac * minSpan) / 2;
  const halfLng = (blobFrac * minSpan) / 2;

  if (num === 1) {
    out.set(ids[0], clampLatLngToInset({ lat: anchorLat, lng: anchorLng }, { s, n, w, e }));
    return out;
  }

  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  for (let i = 0; i < sorted.length; i++) {
    const hi = i + 1;
    const u = halton(hi, 2) * 2 - 1;
    const v = halton(hi, 3) * 2 - 1;
    let lat = anchorLat + u * halfLat;
    let lng = anchorLng + v * halfLng;
    const c = clampLatLngToInset({ lat, lng }, { s, n, w, e });
    out.set(sorted[i], c);
  }

  const MIN_SEP_M = 220;
  const cosMid = Math.cos((anchorLat * Math.PI) / 180);
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.max(0.25, Math.abs(cosMid));

  for (let i = 0; i < sorted.length; i++) {
    const idI = sorted[i];
    let pi = out.get(idI)!;
    for (let j = 0; j < i; j++) {
      const idJ = sorted[j];
      const pj = out.get(idJ)!;
      const d = haversineMeters(pi, pj);
      if (d >= MIN_SEP_M || d < 1e-6) continue;
      const push = MIN_SEP_M - d + 12;
      const dlat = pi.lat - pj.lat;
      const dlng = pi.lng - pj.lng;
      const flat = Math.hypot(dlat * mPerLat, dlng * mPerLng);
      if (flat < 1e-12) {
        const ang = (i * 2.39996322972865332) % (2 * Math.PI);
        pi = {
          lat: pi.lat + (Math.sin(ang) * push) / mPerLat,
          lng: pi.lng + (Math.cos(ang) * push) / mPerLng,
        };
      } else {
        const nx = ((dlat * mPerLat) / flat) * (push / mPerLat);
        const ny = ((dlng * mPerLng) / flat) * (push / mPerLng);
        pi = { lat: pi.lat + nx, lng: pi.lng + ny };
      }
      pi = clampLatLngToInset(pi, { s, n, w, e });
      out.set(idI, pi);
    }
  }

  return out;
}

/**
 * When `vendors[].city` is like "Sacramento County" (CA seed rows), scatter pins in a natural-looking
 * blob inside that county's approximate bounds. Other vendors keep small spiral de-dupe only.
 */
export function layoutVendorPinsWithCountyBounds(
  positions: Map<string, LatLng>,
  vendorRows: Array<{ id: string; city: string; state?: string | null }>
): Map<string, LatLng> {
  const meta = new Map(vendorRows.map((v) => [v.id, v]));
  const out = new Map<string, LatLng>();
  const byCountyKey = new Map<string, string[]>();
  const withoutLayout: string[] = [];

  for (const id of Array.from(positions.keys())) {
    const row = meta.get(id);
    const state = String(row?.state ?? '').trim().toUpperCase();
    const isCA = !state || state === 'CA';
    const countyName = row ? premiseCountyNameFromVendorCity(row.city) : null;
    const bbox = countyName && isCA ? boundsForCaliforniaCountyName(countyName) : null;
    if (countyName && isCA && bbox) {
      const k = normalizeCountyLookupKey(countyName);
      let arr = byCountyKey.get(k);
      if (!arr) {
        arr = [];
        byCountyKey.set(k, arr);
      }
      arr.push(id);
    } else {
      withoutLayout.push(id);
    }
  }

  for (const [countyKey, ids] of Array.from(byCountyKey.entries())) {
    const bbox = CA_COUNTY_MAP_BOUNDS[countyKey];
    if (!bbox || ids.length === 0) continue;
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    const laid = quasiRandomLatLngInBoundingBox(sorted, bbox);
    for (const [id, ll] of Array.from(laid.entries())) out.set(id, ll);
  }

  const sub = new Map<string, LatLng>();
  for (const id of withoutLayout) {
    const p = positions.get(id);
    if (p) sub.set(id, p);
  }
  const spread = spreadOverlappingMarkerPositions(sub, {
    baseRadiusMeters: 260,
    spreadExponent: 0.6,
    maxRadiusMeters: 8000,
  });
  for (const [id, ll] of Array.from(spread.entries())) out.set(id, ll);

  return out;
}
