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
