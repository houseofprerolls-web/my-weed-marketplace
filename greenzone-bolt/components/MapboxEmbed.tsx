'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/mapbox';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { DEFAULT_MAP_CENTER } from '@/lib/mapCoordinates';
import type { MapViewportBounds } from '@/lib/mapViewportBounds';
import { mapboxTokenConfigured as mapboxTokenConfiguredFromEnv } from '@/lib/mapboxToken';

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
  /** Green = storefront-only; red = delivery-only; violet = both public lanes. */
  pinVariant?: 'storefront' | 'delivery' | 'both';
  /** Amber outline when the listing has an active deal (counts come from discovery payload). */
  hasActiveDeal?: boolean;
  /** No online menu: compact dot. With menu: circular logo / initial marker. */
  pinPresentation?: 'logo' | 'dot';
  /** Extra line in click popup (e.g. secondary location name). */
  locationLabel?: string | null;
  /** Public listing URL for popup CTA. */
  listingHref?: string;
  onClick?: () => void;
};

export function mapboxTokenConfigured(): boolean {
  return mapboxTokenConfiguredFromEnv();
}

export function MapboxEmbed({
  markers,
  className = '',
  minHeight = 400,
  viewportRequest = null,
  anchorCenter = null,
  anchorZoom = 10,
  onViewportBoundsChange = null,
}: {
  markers: MapboxMarker[];
  className?: string;
  minHeight?: number;
  /** When `trigger` changes, map flies to bounds or center (pan/zoom still user-controlled between updates). */
  viewportRequest?: MapboxViewportRequest | null;
  /**
   * When set, the map opens here (e.g. shopper ZIP) instead of the centroid of markers —
   * centroid can skew toward unrelated regions when coordinates span multiple markets.
   */
  anchorCenter?: { lat: number; lng: number } | null;
  anchorZoom?: number;
  /** Fires after pan/zoom (and once when the map loads) with the visible bounds in WGS84. */
  onViewportBoundsChange?: ((bounds: MapViewportBounds) => void) | null;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
  const mapRef = useRef<MapRef>(null);
  const [openMarkerId, setOpenMarkerId] = useState<string | null>(null);

  const emitBounds = useCallback(() => {
    if (!onViewportBoundsChange) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    onViewportBoundsChange({
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    });
  }, [onViewportBoundsChange]);

  const { center, zoom } = useMemo(() => {
    if (
      anchorCenter != null &&
      Number.isFinite(anchorCenter.lat) &&
      Number.isFinite(anchorCenter.lng)
    ) {
      const z =
        typeof anchorZoom === 'number' && Number.isFinite(anchorZoom)
          ? Math.min(14, Math.max(4, anchorZoom))
          : 10;
      return { center: anchorCenter, zoom: z };
    }
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
  }, [markers, anchorCenter, anchorZoom]);

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
        onLoad={() => {
          // Defer one frame so getBounds() reflects the loaded style/viewport.
          queueMicrotask(() => emitBounds());
        }}
        onMoveEnd={() => {
          queueMicrotask(() => emitBounds());
        }}
        onClick={() => setOpenMarkerId(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {openMarkerId
          ? (() => {
              const m = markers.find((x) => x.id === openMarkerId);
              if (!m || m.isUser) return null;
              return (
                <Popup
                  key={`popup-${m.id}`}
                  longitude={m.lng}
                  latitude={m.lat}
                  anchor="bottom"
                  offset={18}
                  onClose={() => setOpenMarkerId(null)}
                  closeButton
                  closeOnClick={false}
                >
                  <div className="min-w-[200px] max-w-[260px] px-1 py-0.5 text-zinc-900">
                    <div className="font-semibold leading-snug">{m.label}</div>
                    {m.locationLabel?.trim() ? (
                      <div className="mt-1 text-xs text-zinc-600">{m.locationLabel.trim()}</div>
                    ) : null}
                    {m.listingHref ? (
                      <Link
                        href={m.listingHref}
                        className="mt-2 inline-block text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
                      >
                        View store
                      </Link>
                    ) : null}
                  </div>
                </Popup>
              );
            })()
          : null}
        {markers.map((m) => {
          const isBoth = m.pinVariant === 'both';
          const isDelivery = m.pinVariant === 'delivery';
          const isDot = m.pinPresentation === 'dot';
          const dealRing = m.hasActiveDeal ? ' ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950' : '';
          const ringBoth =
            'block rounded-full border-[3px] border-violet-400 shadow-[0_4px_20px_rgba(167,139,250,0.4)] transition hover:scale-110 hover:border-violet-300' +
            dealRing;
          const ring = isBoth
            ? ringBoth
            : isDelivery
              ? 'block rounded-full border-[3px] border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.35)] transition hover:scale-110 hover:border-red-400' +
                dealRing
              : 'block rounded-full border-[3px] border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition hover:scale-110 hover:border-emerald-300' +
                dealRing;
          const btnRingBoth =
            'block rounded-full border-[3px] border-violet-500 shadow-[0_4px_16px_rgba(139,92,246,0.35)] transition hover:scale-110 hover:border-violet-400' +
            dealRing;
          const btnRing = isBoth
            ? btnRingBoth
            : isDelivery
              ? 'block rounded-full border-[3px] border-red-500 shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition hover:scale-110 hover:border-red-400' +
                dealRing
              : 'block rounded-full border-[3px] border-green-500 shadow-lg transition hover:scale-110 hover:border-green-400' +
                dealRing;

          const dotFill = isBoth
            ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.55)]'
            : isDelivery
              ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
              : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]';
          const dotBtn =
            `flex h-2.5 w-2.5 shrink-0 rounded-full ${dotFill} transition hover:scale-125` + dealRing;

          return (
          <Marker
            key={m.id}
            longitude={m.lng}
            latitude={m.lat}
            anchor={isDot ? 'center' : 'bottom'}
          >
            {m.isUser ? (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-500/90 text-[10px] font-bold text-white shadow-lg"
                title="Your location"
              >
                You
              </div>
            ) : isDot ? (
              <button
                type="button"
                title={m.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenMarkerId(m.id);
                  m.onClick?.();
                }}
                className={dotBtn}
                aria-label={m.label}
              />
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
                        isBoth
                          ? 'flex h-full w-full items-center justify-center bg-violet-950/50 text-sm font-bold text-violet-200'
                          : isDelivery
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
                  setOpenMarkerId(m.id);
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
                        isBoth
                          ? 'text-sm font-bold text-violet-300'
                          : isDelivery
                            ? 'text-sm font-bold text-red-400'
                            : 'text-sm font-bold text-green-400'
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
