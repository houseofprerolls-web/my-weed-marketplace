/** Parse PostGIS geography / GeoJSON / WKT from Supabase into lat/lng. */

export function parseVendorLocationToLatLng(v: unknown): { lat: number; lng: number } | null {
  if (v == null) return null;

  if (typeof v === 'string') {
    const m = v.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (m) {
      const lng = Number(m[1]);
      const lat = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    return null;
  }

  if (typeof v === 'object' && v !== null && 'type' in v) {
    const o = v as { type?: string; coordinates?: unknown };
    if (o.type === 'Point' && Array.isArray(o.coordinates) && o.coordinates.length >= 2) {
      const lng = Number(o.coordinates[0]);
      const lat = Number(o.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  return null;
}
