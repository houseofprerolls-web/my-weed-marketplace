/**
 * Google Maps directions URL for a street or partial address string.
 */
export function googleMapsDirectionsUrl(destination: string): string | null {
  const q = destination.replace(/\s+/g, ' ').trim();
  if (!q) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export function formatListingAddressForMaps(b: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}): string | null {
  const line = [b.address, b.city, b.state, b.zip_code].filter((x) => typeof x === 'string' && x.trim() !== '').join(', ');
  return line.trim() || null;
}
