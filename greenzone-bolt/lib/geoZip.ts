import { extractZip5 } from '@/lib/zipUtils';

/** Default when geolocation is unavailable or reverse-geocode fails (Los Angeles area). */
export const FALLBACK_LA_ZIP = '90210';

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 300_000,
    });
  });
}

/**
 * Browser-friendly reverse geocode (no API key). Returns US ZIP5 or null.
 */
export async function reverseGeocodeZipFromCoords(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      String(lat)
    )}&longitude=${encodeURIComponent(String(lon))}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { postcode?: string };
    return extractZip5(data.postcode ?? '');
  } catch {
    return null;
  }
}

export async function resolveZipFromBrowserLocation(): Promise<string> {
  try {
    const pos = await getCurrentPosition();
    const zip = await reverseGeocodeZipFromCoords(pos.coords.latitude, pos.coords.longitude);
    if (zip && zip.length === 5) return zip;
  } catch {
    // denied, timeout, or network
  }
  return FALLBACK_LA_ZIP;
}
