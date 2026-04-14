/**
 * Delivery pins (red) often share the same warehouse/coords in seed data — nudge duplicates into a small ring
 * so the map stays readable. Storefront pins are left unchanged.
 */
const COORD_KEY_DECIMALS = 5;
/** ~30m separation at equator; scales with cos(lat) for lng */
const BASE_RING_RADIUS = 0.00027;

export type MapPinWithVariant = {
  id: string;
  lat: number;
  lng: number;
  variant: 'storefront' | 'delivery';
};

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(COORD_KEY_DECIMALS)},${lng.toFixed(COORD_KEY_DECIMALS)}`;
}

export function spreadOverlappingDeliveryPins<T extends MapPinWithVariant>(markers: T[]): T[] {
  const delivery = markers.filter((m) => m.variant === 'delivery');
  const byKey = new Map<string, T[]>();
  for (const m of delivery) {
    const k = coordKey(m.lat, m.lng);
    const g = byKey.get(k) ?? [];
    g.push(m);
    byKey.set(k, g);
  }

  const deltaById = new Map<string, { dLat: number; dLng: number }>();
  for (const group of Array.from(byKey.values())) {
    if (group.length < 2) continue;
    const n = group.length;
    group.forEach((m: T, i: number) => {
      const angle = (2 * Math.PI * i) / n;
      const ring = 1 + Math.floor(i / 8);
      const r = BASE_RING_RADIUS * ring;
      const dLat = r * Math.cos(angle);
      const dLng = (r * Math.sin(angle)) / Math.cos((m.lat * Math.PI) / 180);
      deltaById.set(m.id, { dLat, dLng });
    });
  }

  if (deltaById.size === 0) return markers;

  return markers.map((m) => {
    const d = deltaById.get(m.id);
    if (!d) return m;
    return {
      ...m,
      lat: m.lat + d.dLat,
      lng: m.lng + d.dLng,
    };
  });
}
