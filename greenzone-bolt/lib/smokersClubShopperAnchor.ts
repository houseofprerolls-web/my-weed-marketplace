import { extractZip5 } from '@/lib/zipUtils';

export type SmokersClubShopperLatLng = { lat: number; lng: number };

/** Resolved shopper context for Smokers Club radius + scoring. */
export type SmokersClubShopperAnchor = {
  zip5: string | null;
  /** Device/browser anchor when provided (query params from client). */
  latLng: SmokersClubShopperLatLng | null;
  /** True when `latLng` is present — enables mile-radius competition vs ZIP-only listing-market gate. */
  geoMode: boolean;
};

/**
 * Normalize ZIP + optional lat/lng from API or internal callers.
 * Server: pass `lat`/`lng` query params when the homepage has `readShopperGeo()`.
 */
export function normalizeSmokersClubShopperAnchor(params: {
  userZipHint: string | null | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
}): SmokersClubShopperAnchor {
  const zip5 = extractZip5(params.userZipHint ?? '') ?? null;
  const z = zip5 && zip5.length === 5 ? zip5 : null;
  const lat = params.lat;
  const lng = params.lng;
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { zip5: z, latLng: { lat, lng }, geoMode: true };
  }
  return { zip5: z, latLng: null, geoMode: false };
}
