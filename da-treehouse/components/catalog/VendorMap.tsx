"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker } from "react-map-gl/mapbox";
import React, { useMemo } from "react";

export type VendorMarker = {
  vendorId: string;
  name: string;
  slug: string;
  mapMarkerImageUrl: string | null;
  /** Store logo / profile image for listings */
  logoUrl?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number;
  lng: number;
  /** Present when API sorted/filtered by user location */
  distanceMiles?: number | null;
};

export function VendorMap({
  vendors,
  selectedVendorId,
  onSelectVendor,
}: {
  vendors: VendorMarker[];
  selectedVendorId: string | null;
  onSelectVendor: (vendorId: string) => void;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
  const isBrowser = typeof window !== "undefined";

  const center = useMemo(() => {
    const valid = vendors.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng));
    if (valid.length === 0) {
      return { lat: 36.7783, lng: -119.4179 };
    }
    const avgLat =
      valid.reduce((sum, v) => sum + v.lat, 0) / valid.length;
    const avgLng =
      valid.reduce((sum, v) => sum + v.lng, 0) / valid.length;
    return { lat: avgLat, lng: avgLng };
  }, [vendors]);

  const zoom = useMemo(() => {
    const n = vendors.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng)).length;
    if (n <= 1) return 10;
    if (n <= 5) return 8;
    return 6;
  }, [vendors]);

  if (!isBrowser) {
    return (
      <div className="h-[460px] w-full rounded-xl border bg-muted/20" />
    );
  }

  if (!token) {
    return (
      <div className="flex h-[460px] w-full flex-col items-center justify-center gap-2 rounded-xl border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        <p>
          Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            NEXT_PUBLIC_MAPBOX_TOKEN
          </code>{" "}
          in <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>{" "}
          (from{" "}
          <a
            href="https://account.mapbox.com/access-tokens/"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Mapbox account → tokens
          </a>
          ) and on your host.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[460px] w-full overflow-hidden rounded-xl border bg-muted/20">
      <Map
        mapboxAccessToken={token}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {vendors.map((v) => {
          if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return null;
          const isSelected = selectedVendorId === v.vendorId;
          return (
            <Marker
              key={v.vendorId}
              longitude={v.lng}
              latitude={v.lat}
              anchor="bottom"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectVendor(v.vendorId);
                }}
                className={[
                  "relative rounded-full border transition-transform",
                  "focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected ? "scale-110 border-primary" : "border-border hover:scale-105",
                ].join(" ")}
                style={{
                  width: 44,
                  height: 44,
                  background: isSelected ? "rgba(21, 128, 61, 0.18)" : "rgba(0,0,0,0.25)",
                }}
                aria-label={`Select vendor ${v.name}`}
                title={v.name}
              >
                {v.mapMarkerImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.mapMarkerImageUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary-foreground">
                    {v.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
