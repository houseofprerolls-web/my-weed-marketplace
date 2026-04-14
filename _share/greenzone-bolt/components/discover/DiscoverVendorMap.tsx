'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MapboxEmbed, mapboxTokenConfigured, type MapboxMarker } from '@/components/MapboxEmbed';
import { hashJitter, mapCenterForCaZipOrDefault } from '@/lib/mapCoordinates';

export type DiscoverMapVendor = {
  id: string;
  business_name: string;
  logo_url?: string;
  map_marker_image_url?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  zip?: string;
  offers_delivery?: boolean;
  offers_storefront?: boolean;
};

function markerPinVariant(v: DiscoverMapVendor): 'storefront' | 'delivery' {
  if (v.offers_storefront) return 'storefront';
  if (v.offers_delivery) return 'delivery';
  return 'storefront';
}

function buildMarkerPositions(
  vendors: DiscoverMapVendor[],
  userLat: number | null,
  userLng: number | null
): {
  id: string;
  leftPct: number;
  topPct: number;
  img: string | null;
  label: string;
  variant: 'storefront' | 'delivery';
}[] {
  const coords: {
    id: string;
    lat: number;
    lng: number;
    img: string | null;
    label: string;
    variant: 'storefront' | 'delivery';
  }[] = [];

  for (const v of vendors) {
    const img = v.map_marker_image_url || v.logo_url || null;
    if (v.geo_lat != null && v.geo_lng != null && Number.isFinite(v.geo_lat) && Number.isFinite(v.geo_lng)) {
      coords.push({
        id: v.id,
        lat: v.geo_lat,
        lng: v.geo_lng,
        img,
        label: v.business_name,
        variant: markerPinVariant(v),
      });
    } else {
      const j = hashJitter(v.id, v.zip, mapCenterForCaZipOrDefault(v.zip));
      coords.push({
        id: v.id,
        lat: j.lat,
        lng: j.lng,
        img,
        label: v.business_name,
        variant: markerPinVariant(v),
      });
    }
  }

  if (userLat != null && userLng != null) {
    coords.push({
      id: '__user__',
      lat: userLat,
      lng: userLng,
      img: null,
      label: 'You',
      variant: 'storefront',
    });
  }

  if (coords.length === 0) return [];

  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLng = coords[0].lng;
  let maxLng = coords[0].lng;
  for (const c of coords) {
    minLat = Math.min(minLat, c.lat);
    maxLat = Math.max(maxLat, c.lat);
    minLng = Math.min(minLng, c.lng);
    maxLng = Math.max(maxLng, c.lng);
  }

  const padLat = Math.max((maxLat - minLat) * 0.15, 0.04);
  const padLng = Math.max((maxLng - minLng) * 0.15, 0.04);
  minLat -= padLat;
  maxLat += padLat;
  minLng -= padLng;
  maxLng += padLng;

  const latSpan = Math.max(maxLat - minLat, 0.02);
  const lngSpan = Math.max(maxLng - minLng, 0.02);

  return coords.map((c) => ({
    id: c.id,
    leftPct: 6 + ((c.lng - minLng) / lngSpan) * 88,
    topPct: 8 + ((maxLat - c.lat) / latSpan) * 82,
    img: c.img,
    label: c.label,
    variant: c.variant,
  }));
}

type Props = {
  vendors: DiscoverMapVendor[];
  userLat?: number | null;
  userLng?: number | null;
  className?: string;
  /** Shorter map when list view; taller when map-only view */
  dense?: boolean;
};

export function DiscoverVendorMap({
  vendors,
  userLat = null,
  userLng = null,
  className = '',
  dense = false,
}: Props) {
  const useMapbox = mapboxTokenConfigured();

  const mapboxMarkers: MapboxMarker[] = useMemo(() => {
    const out: MapboxMarker[] = [];
    for (const v of vendors) {
      const img = v.map_marker_image_url || v.logo_url || null;
      let lat: number;
      let lng: number;
      if (
        v.geo_lat != null &&
        v.geo_lng != null &&
        Number.isFinite(v.geo_lat) &&
        Number.isFinite(v.geo_lng)
      ) {
        lat = v.geo_lat;
        lng = v.geo_lng;
      } else {
        const j = hashJitter(v.id, v.zip, mapCenterForCaZipOrDefault(v.zip));
        lat = j.lat;
        lng = j.lng;
      }
      out.push({
        id: v.id,
        lat,
        lng,
        label: v.business_name,
        imageUrl: img,
        href: `/listing/${v.id}`,
        pinVariant: markerPinVariant(v),
      });
    }
    if (userLat != null && userLng != null) {
      out.push({
        id: '__user__',
        lat: userLat,
        lng: userLng,
        label: 'You',
        isUser: true,
      });
    }
    return out;
  }, [vendors, userLat, userLng]);

  const markers = buildMarkerPositions(vendors, userLat ?? null, userLng ?? null);
  const minH = dense ? 280 : 400;

  if (useMapbox && mapboxMarkers.length > 0) {
    return (
      <Card
        className={`overflow-hidden border-emerald-200/30 bg-gradient-to-br from-slate-900 to-slate-950 shadow-lg ${className}`}
      >
        <div
          className={`relative w-full ${
            dense
              ? 'h-[min(320px,48vh)] min-h-[240px]'
              : 'h-[min(560px,72vh)] min-h-[360px] md:h-[min(640px,75vh)]'
          }`}
        >
          <MapboxEmbed markers={mapboxMarkers} className="h-full" minHeight={minH} />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`overflow-hidden border-emerald-200/30 bg-gradient-to-br from-slate-900 to-slate-950 shadow-lg ${className}`}
    >
      <div
        className={`relative w-full ${
          dense
            ? 'h-[min(320px,48vh)] min-h-[240px]'
            : 'h-[min(560px,72vh)] min-h-[360px] md:h-[min(640px,75vh)]'
        }`}
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,78,59,0.35) 0%, rgba(15,23,42,0.95) 45%, rgba(2,6,23,1) 100%), radial-gradient(ellipse 80% 50% at 50% 40%, rgba(16,185,129,0.12), transparent 70%)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />

        <div className="absolute left-4 top-3 z-20 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-black/50 px-3 py-1.5 text-xs text-emerald-100 backdrop-blur-sm">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
          <span>Tap a photo to open the listing</span>
        </div>

        {markers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            No vendors to map yet.
          </div>
        ) : (
          markers.map((m) => {
            const isUser = m.id === '__user__';
            return (
              <div
                key={m.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${m.leftPct}%`, top: `${m.topPct}%` }}
              >
                {isUser ? (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-500/90 text-[10px] font-bold text-white shadow-lg"
                    title="Your location"
                  >
                    You
                  </div>
                ) : (
                  <Link
                    href={`/listing/${m.id}`}
                    title={m.label}
                    className={
                      m.variant === "delivery"
                        ? "block rounded-full border-[3px] border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.35)] transition hover:scale-110 hover:border-red-400"
                        : "block rounded-full border-[3px] border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition hover:scale-110 hover:border-emerald-300"
                    }
                  >
                    <div className="h-11 w-11 overflow-hidden rounded-full bg-slate-800 md:h-12 md:w-12">
                      {m.img ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote vendor assets
                        <img src={m.img} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className={
                            m.variant === "delivery"
                              ? "flex h-full w-full items-center justify-center bg-red-950/50 text-sm font-bold text-red-200"
                              : "flex h-full w-full items-center justify-center bg-emerald-900/50 text-sm font-bold text-emerald-200"
                          }
                        >
                          {m.label.charAt(0)}
                        </div>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            );
          })
        )}

        <p className="pointer-events-none absolute bottom-2 left-1/2 z-0 -translate-x-1/2 text-center text-[10px] uppercase tracking-widest text-slate-500">
          Preview map · add NEXT_PUBLIC_MAPBOX_TOKEN for live Mapbox
        </p>
      </div>
    </Card>
  );
}
