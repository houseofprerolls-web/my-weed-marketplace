/** Anonymous geo cache (browser). */
export const GEO_LOCAL_STORAGE_KEY = "cannahub_geo_v1";

export type StoredGeo = {
  lat: number;
  lng: number;
  geo_state: string | null;
  updatedAt: string;
};

export function parseStoredGeo(raw: string | null): StoredGeo | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as StoredGeo;
    if (
      typeof v.lat === "number" &&
      typeof v.lng === "number" &&
      typeof v.updatedAt === "string"
    ) {
      return {
        lat: v.lat,
        lng: v.lng,
        geo_state:
          typeof v.geo_state === "string" || v.geo_state === null
            ? v.geo_state
            : null,
        updatedAt: v.updatedAt,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
