/** Mapbox Geocoding API — same token as map tiles. */

export type MapboxGeocodeResult = {
  placeName: string;
  center: { lng: number; lat: number };
  lat: number;
  lng: number;
  /** ZIP when Mapbox provides it on the feature context */
  postcode: string | null;
  /** minLng, minLat, maxLng, maxLat — from API or synthesized around center */
  bbox: [number, number, number, number] | null;
};

export type MapboxForwardGeocodeOptions = {
  /** Prefer place-like features (city / neighborhood) for tighter map area search */
  restrictToPlaces?: boolean;
};

function bboxAroundCenter(lng: number, lat: number, halfDeg: number): [number, number, number, number] {
  return [lng - halfDeg, lat - halfDeg, lng + halfDeg, lat + halfDeg];
}

function postcodeFromFeature(f: { context?: Array<{ id?: string; text?: string }> }): string | null {
  const ctx = f.context ?? [];
  for (const c of ctx) {
    const id = c.id ?? '';
    if (id.startsWith('postcode.')) {
      const t = (c.text ?? '').trim();
      return t || id.replace('postcode.', '').trim() || null;
    }
  }
  return null;
}

export function mapboxTokenForGeocode(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
}

export async function mapboxForwardGeocode(
  query: string,
  accessToken?: string,
  options?: MapboxForwardGeocodeOptions
): Promise<MapboxGeocodeResult | null> {
  const q = query.trim();
  const token = (accessToken ?? mapboxTokenForGeocode()).trim();
  if (!q || !token) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
  );
  url.searchParams.set('access_token', token);
  url.searchParams.set('country', 'US');
  if (options?.restrictToPlaces) {
    url.searchParams.set('types', 'place,locality,neighborhood,district,region');
  }
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{
      place_name?: string;
      center?: [number, number];
      bbox?: [number, number, number, number];
      context?: Array<{ id?: string; text?: string }>;
    }>;
  };

  const f = data.features?.[0];
  if (!f?.center || f.center.length < 2) return null;

  const [lng, lat] = f.center;
  let bbox: [number, number, number, number] | null =
    f.bbox && f.bbox.length === 4 ? f.bbox : null;

  if (!bbox) {
    const pad = options?.restrictToPlaces ? 0.12 : 0.02;
    bbox = bboxAroundCenter(lng, lat, pad);
  }

  return {
    placeName: String(f.place_name ?? q),
    center: { lng, lat },
    lat,
    lng,
    postcode: postcodeFromFeature(f),
    bbox,
  };
}

export async function mapboxReverseGeocodePostcode(lng: number, lat: number): Promise<string | null> {
  const token = mapboxTokenForGeocode();
  if (!token) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${lng},${lat}`)}.json`
  );
  url.searchParams.set('access_token', token);
  url.searchParams.set('types', 'postcode');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{ properties?: { short_code?: string }; text?: string; place_name?: string }>;
  };

  const feat = data.features?.[0];
  if (!feat) return null;
  const sc = feat.properties?.short_code?.trim();
  if (sc) return sc;
  const t = feat.text?.trim();
  if (t && /^\d{5}(-\d{4})?$/.test(t)) return t;
  const name = feat.place_name?.trim();
  if (name) {
    const m = name.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (m) return m[1];
  }
  return null;
}

/** Parsed street + locality from a Mapbox reverse-geocode feature (US-focused). */
export type MapboxReverseAddressResult = {
  /** Street number + street name */
  addressLine: string;
  city: string | null;
  /** Two-letter state when available */
  state: string | null;
  zip: string | null;
  placeName: string;
};

function regionShortState(regionCtx: { id?: string; short_code?: string; text?: string } | undefined): string | null {
  if (!regionCtx) return null;
  const sc = regionCtx.short_code?.trim();
  if (sc?.startsWith('US-') && sc.length >= 5) return sc.slice(3, 5).toUpperCase();
  const id = regionCtx.id ?? '';
  if (id.startsWith('region.') && id.length >= 8) {
    const tail = id.replace('region.', '');
    if (/^[A-Z]{2}$/i.test(tail)) return tail.toUpperCase();
  }
  return null;
}

/**
 * Reverse-geocode a point to a US mailing-style line + city/state/ZIP (best effort).
 * Tries `types=address` first, then a single untyped reverse hit as fallback.
 */
export async function mapboxReverseGeocodeUsAddress(
  lng: number,
  lat: number,
  accessToken?: string
): Promise<MapboxReverseAddressResult | null> {
  const token = (accessToken ?? mapboxTokenForGeocode()).trim();
  if (!token) return null;

  async function fetchReverse(types: string | null): Promise<MapboxReverseAddressResult | null> {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${lng},${lat}`)}.json`
    );
    url.searchParams.set('access_token', token);
    if (types) url.searchParams.set('types', types);
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        place_name?: string;
        text?: string;
        properties?: { address?: string };
        context?: Array<{ id?: string; text?: string; short_code?: string }>;
      }>;
    };

    const feat = data.features?.[0];
    if (!feat) return null;

    const ctx = feat.context ?? [];
    const num = (feat.text ?? '').trim();
    const streetName = (feat.properties?.address ?? '').trim();
    const addressLine =
      [num, streetName].filter(Boolean).join(' ').trim() ||
      (feat.place_name ?? '').split(',')[0]?.trim() ||
      '';

    const postcode = postcodeFromFeature(feat);
    const locality = ctx.find((c) => c.id?.startsWith('locality.'));
    const place = ctx.find((c) => c.id?.startsWith('place.'));
    const city = (locality?.text ?? place?.text ?? null)?.trim() || null;

    const region = ctx.find((c) => c.id?.startsWith('region.'));
    const state = regionShortState(region);

    const placeName = String(feat.place_name ?? addressLine);

    if (!addressLine && !city && !state && !postcode) return null;

    return {
      addressLine: addressLine || placeName,
      city,
      state,
      zip: postcode,
      placeName,
    };
  }

  return (await fetchReverse('address')) ?? (await fetchReverse(null));
}
