/** Geographic rectangle from Mapbox `getBounds()` (degrees). */
export type MapViewportBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** Treat two viewports as the same for “Search this area” affordance. */
export function boundsAlmostEqual(
  a: MapViewportBounds,
  b: MapViewportBounds,
  epsCenterLat = 0.004,
  epsCenterLng = 0.004,
  epsSpanLat = 0.008,
  epsSpanLng = 0.008
): boolean {
  const caLat = (a.north + a.south) / 2;
  const caLng = (a.east + a.west) / 2;
  const cbLat = (b.north + b.south) / 2;
  const cbLng = (b.east + b.west) / 2;
  if (Math.abs(caLat - cbLat) > epsCenterLat || Math.abs(caLng - cbLng) > epsCenterLng) return false;
  if (Math.abs(a.north - a.south - (b.north - b.south)) > epsSpanLat) return false;
  if (Math.abs(a.east - a.west - (b.east - b.west)) > epsSpanLng) return false;
  return true;
}

export function businessInViewport(
  coordinates: { lat: number; lng: number } | undefined,
  box: MapViewportBounds
): boolean {
  if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    return false;
  }
  const { lat, lng } = coordinates;
  if (lat < box.south || lat > box.north) return false;
  if (box.west <= box.east) {
    return lng >= box.west && lng <= box.east;
  }
  return lng >= box.west || lng <= box.east;
}

/** True when any coordinate lies inside the map bounds (multi-pin vendors). */
export function anyPinInViewport(
  coordinatesList: ReadonlyArray<{ lat: number; lng: number } | undefined>,
  box: MapViewportBounds
): boolean {
  for (const c of coordinatesList) {
    if (businessInViewport(c, box)) return true;
  }
  return false;
}
