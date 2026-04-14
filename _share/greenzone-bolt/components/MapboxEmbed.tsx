'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_MAP_CENTER } from '@/lib/mapCoordinates';

export type MapboxViewportRequest =
  | {
      kind: 'fitBounds';
      bbox: [number, number, number, number];
      trigger: number;
      padding?: number;
      maxZoom?: number;
    }
  | {
      kind: 'flyTo';
      longitude: number;
      latitude: number;
      zoom?: number;
      trigger: number;
    };

export type MapboxMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  imageUrl?: string | null;
  href?: string;
  isUser?: boolean;
  /** Storefront / pickup pins = green ring; delivery-only directory pins = red */
  pinVariant?: 'storefront' | 'delivery';
  onClick?: () => void;
};

export function mapboxTokenConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim());
}

export function MapboxEmbed({
  markers,
  className = '',
  minHeight = 400,
  viewportRequest = null,
}: {
  markers: MapboxMarker[];
  className?: string;
  minHeight?: number;
  /** When `trigger` changes, map flies to bounds or center (pan/zoom still user-controlled between updates). */
  viewportRequest?: MapboxViewportRequest | null;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
  const mapRef = useRef<MapRef>(null);

  const { center, zoom } = useMemo(() => {
    const valid = markers.filter(
      (m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)
    );
    if (valid.length === 0) {
      return { center: DEFAULT_MAP_CENTER, zoom: 9 };
    }
    const avgLat = valid.reduce((s, m) => s + m.lat, 0) / valid.length;
    const avgLng = valid.reduce((s, m) => s + m.lng, 0) / valid.length;
    const z =
      valid.length <= 1 ? 11 : valid.length <= 8 ? 9 : valid.length <= 20 ? 7 : 6;
    return { center: { lat: avgLat, lng: avgLng }, zoom: z };
  }, [markers]);

  useEffect(() => {
    if (!viewportRequest || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    if (viewportRequest.kind === 'fitBounds') {
      map.fitBounds(viewportRequest.bbox, {
        padding: viewportRequest.padding ?? 48,
        maxZoom: viewportRequest.maxZoom ?? 11,
        duration: 1200,
        essential: true,
      });
      return;
    }

    map.flyTo({
      center: [viewportRequest.longitude, viewportRequest.latitude],
      zoom: viewportRequest.zoom ?? 10,
      duration: 1200,
      essential: true,
    });
  }, [viewportRequest]);

  if (!token) {
    return null;
  }

  return (
    <div
      className={className}
      style={{ minHeight, width: '100%', height: '100%' }}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom,
        }}
        style={{ width: '100%', height: '100%', minHeight }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        dragPan
        scrollZoom
        doubleClickZoom
        touchZoomRotate
        keyboard
        dragRotate={false}
        touchPitch={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {markers.map((m) => {
          const isDelivery = m.pinVariant === 'delivery';
          const ring = isDelivery
            ? 'block rounded-full border-[3px] border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.35)] transition hover:scale-110 hover:border-red-400'
            : 'block rounded-full border-[3px] border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition hover:scale-110 hover:border-emerald-300';
          const btnRing = isDelivery
            ? 'block rounded-full border-[3px] border-red-500 shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition hover:scale-110 hover:border-red-400'
            : 'block rounded-full border-[3px] border-green-500 shadow-lg transition hover:scale-110 hover:border-green-400';
          return (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="bottom">
            {m.isUser ? (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-500/90 text-[10px] font-bold text-white shadow-lg"
                title="Your location"
              >
                You
              </div>
            ) : m.href ? (
              <Link
                href={m.href}
                title={m.label}
                className={ring}
              >
                <div className="h-11 w-11 overflow-hidden rounded-full bg-slate-800 md:h-12 md:w-12">
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={
                        isDelivery
                          ? 'flex h-full w-full items-center justify-center bg-red-950/50 text-sm font-bold text-red-200'
                          : 'flex h-full w-full items-center justify-center bg-emerald-900/50 text-sm font-bold text-emerald-200'
                      }
                    >
                      {m.label.charAt(0)}
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <button
                type="button"
                title={m.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  m.onClick?.();
                }}
                className={btnRing}
              >
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-900 md:h-12 md:w-12">
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className={
                        isDelivery ? 'text-sm font-bold text-red-400' : 'text-sm font-bold text-green-400'
                      }
                    >
                      {m.label.charAt(0)}
                    </span>
                  )}
                </div>
              </button>
            )}
          </Marker>
          );
        })}
      </Map>
    </div>
  );
}
