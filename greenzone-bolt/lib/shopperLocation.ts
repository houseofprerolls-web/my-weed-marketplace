import { extractZip5 } from "@/lib/zipUtils";
import { FALLBACK_LA_ZIP } from "@/lib/geoZip";

/** Storewide shopper ZIP for rankings / discover (persists in localStorage). */
export const SHOPPER_ZIP_STORAGE_KEY = "datreehouse_zip";

const SHOPPER_GEO_STORAGE_KEY = "datreehouse_shopper_geo";

/** @deprecated use SHOPPER_ZIP_STORAGE_KEY */
export const ZIP_KEY = SHOPPER_ZIP_STORAGE_KEY;

export function readShopperZipRaw(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SHOPPER_ZIP_STORAGE_KEY);
  // Default customers to Los Angeles when no ZIP has been set.
  if (!stored || stored.trim() === "") return FALLBACK_LA_ZIP;
  return stored;
}

export function readShopperZip5(): string | null {
  const raw = readShopperZipRaw();
  return extractZip5(raw || "") ?? FALLBACK_LA_ZIP;
}

export function persistShopperZip(zip5: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHOPPER_ZIP_STORAGE_KEY, zip5);
  window.dispatchEvent(new CustomEvent("datreehouse:zip", { detail: zip5 }));
}

/** Last browser geolocation used with “Near me” (for distance sort / cards). */
export function persistShopperGeo(lat: number, lng: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHOPPER_GEO_STORAGE_KEY, JSON.stringify({ lat, lng }));
  window.dispatchEvent(new CustomEvent("datreehouse:geo", { detail: { lat, lng } }));
}

export function clearShopperGeo() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SHOPPER_GEO_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("datreehouse:geo", { detail: null }));
}

export function readShopperGeo(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SHOPPER_GEO_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof o.lat !== "number" || typeof o.lng !== "number") return null;
    if (!Number.isFinite(o.lat) || !Number.isFinite(o.lng)) return null;
    return { lat: o.lat, lng: o.lng };
  } catch {
    return null;
  }
}
