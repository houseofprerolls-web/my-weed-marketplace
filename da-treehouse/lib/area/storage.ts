/** Browse area (ZIP geocode or device location). */
export const AREA_LOCAL_STORAGE_KEY = "cannahub_area_v1";

export type AreaPrefs = {
  zip: string;
  label: string;
  lat: number;
  lng: number;
  updatedAt: string;
  /** zip = from postal search; geo = from saved device location */
  source: "zip" | "geo";
};

export function normalizeUsZip(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

export function parseStoredArea(raw: string | null): AreaPrefs | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<AreaPrefs>;
    if (
      typeof v.lat === "number" &&
      typeof v.lng === "number" &&
      typeof v.label === "string" &&
      typeof v.updatedAt === "string" &&
      (v.source === "zip" || v.source === "geo") &&
      typeof v.zip === "string"
    ) {
      return {
        zip: v.zip,
        label: v.label,
        lat: v.lat,
        lng: v.lng,
        updatedAt: v.updatedAt,
        source: v.source,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredArea(prefs: AreaPrefs) {
  try {
    localStorage.setItem(AREA_LOCAL_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
}
