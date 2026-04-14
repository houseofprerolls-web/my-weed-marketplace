"use client";

import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { MapboxEmbed, mapboxTokenConfigured, type MapboxViewportRequest } from '@/components/MapboxEmbed';

type Business = {
  id: string;
  name: string;
  address: string;
  city: string;
  rating: number;
  coordinates?: { lat: number; lng: number };
  logo_url?: string;
  offers_delivery?: boolean;
  offers_storefront?: boolean;
};

function pinVariantFor(b: Business): 'storefront' | 'delivery' {
  if (b.offers_storefront) return 'storefront';
  if (b.offers_delivery) return 'delivery';
  return 'storefront';
}

type MapProps = {
  businesses?: Business[];
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ position: { lat: number; lng: number }; title: string; id: string }>;
  onBusinessClick?: (business: Business) => void;
  viewportRequest?: MapboxViewportRequest | null;
};

export default function Map({
  businesses = [],
  center,
  zoom: _zoom = 11,
  markers = [],
  onBusinessClick,
  viewportRequest = null,
}: MapProps) {
  const defaultCenter = center || { lat: 34.0522, lng: -118.2437 };
  const displayItems = markers.length > 0 ? markers : businesses;
  const useMapbox = mapboxTokenConfigured();

  const mapboxMarkers =
    useMapbox && markers.length > 0
      ? markers.map((m) => ({
          id: m.id,
          lat: m.position.lat,
          lng: m.position.lng,
          label: m.title,
          onClick: () => {
            const b = businesses.find((x) => x.id === m.id);
            if (b) onBusinessClick?.(b);
          },
        }))
      : useMapbox
        ? businesses
            .filter((b) => b.coordinates && Number.isFinite(b.coordinates.lat) && Number.isFinite(b.coordinates.lng))
            .map((b) => ({
              id: b.id,
              lat: b.coordinates!.lat,
              lng: b.coordinates!.lng,
              label: b.name,
              imageUrl: b.logo_url ?? null,
              pinVariant: pinVariantFor(b),
              onClick: () => onBusinessClick?.(b),
            }))
        : [];

  if (useMapbox) {
    return (
      <Card className="overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black">
        <div className="relative h-[400px] md:h-[600px]">
          <MapboxEmbed
            markers={mapboxMarkers}
            minHeight={400}
            className="h-full md:min-h-[600px]"
            viewportRequest={viewportRequest}
          />
          {mapboxMarkers.length === 0 && (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-green-900/40 bg-black/75 px-3 py-2 text-center text-sm text-gray-300 backdrop-blur-sm">
              No shop coordinates loaded — try again later or contact support.
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black">
      <div className="relative h-[400px] bg-gray-800 md:h-[600px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h3 className="mb-2 text-xl font-bold text-white">Interactive Map</h3>
            <p className="mb-4 max-w-md text-gray-400">
              Add{' '}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-green-300">
                NEXT_PUBLIC_MAPBOX_TOKEN
              </code>{' '}
              to enable Mapbox.
              <br />
              Showing {displayItems.length} locations in the area.
            </p>
            <div className="text-sm text-gray-500">
              Coordinates: {defaultCenter.lat.toFixed(4)}, {defaultCenter.lng.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0">
          {businesses.slice(0, 5).map((business, index) => {
            const top = 20 + index * 15;
            const left = 30 + index * 12;

            return (
              <div
                key={business.id}
                className="pointer-events-auto absolute flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-green-600 text-xs font-bold text-white shadow-lg transition hover:scale-110"
                style={{ top: `${top}%`, left: `${left}%` }}
                onClick={() => onBusinessClick?.(business)}
                title={business.name}
              >
                {index + 1}
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-4 left-4 rounded-lg border border-green-900/20 bg-black/80 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-sm text-white">
            <div className="h-4 w-4 rounded-full border border-white bg-green-600" />
            <span>Business Location</span>
          </div>
          <div className="text-xs text-gray-400">Click markers for details</div>
        </div>
      </div>
    </Card>
  );
}
