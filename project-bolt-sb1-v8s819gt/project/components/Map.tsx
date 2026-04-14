"use client";

import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

type Business = {
  id: string;
  name: string;
  address: string;
  city: string;
  rating: number;
  coordinates?: { lat: number; lng: number };
};

type MapProps = {
  businesses?: Business[];
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ position: { lat: number; lng: number }; title: string; id: string }>;
  onBusinessClick?: (business: Business) => void;
};

export default function Map({ businesses = [], center, zoom = 11, markers = [], onBusinessClick }: MapProps) {
  const defaultCenter = center || { lat: 34.0522, lng: -118.2437 };
  const displayItems = markers.length > 0 ? markers : businesses;

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 overflow-hidden">
      <div className="relative h-[400px] md:h-[600px] bg-gray-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Interactive Map</h3>
            <p className="text-gray-400 mb-4 max-w-md">
              Map integration requires Google Maps API key.
              <br />
              Showing {displayItems.length} locations in the area.
            </p>
            <div className="text-sm text-gray-500">
              Coordinates: {defaultCenter.lat.toFixed(4)}, {defaultCenter.lng.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Simulated map markers */}
        <div className="absolute inset-0 pointer-events-none">
          {businesses.slice(0, 5).map((business, index) => {
            const top = 20 + (index * 15);
            const left = 30 + (index * 12);

            return (
              <div
                key={business.id}
                className="absolute w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold pointer-events-auto cursor-pointer hover:scale-110 transition"
                style={{ top: `${top}%`, left: `${left}%` }}
                onClick={() => onBusinessClick?.(business)}
                title={business.name}
              >
                {index + 1}
              </div>
            );
          })}
        </div>

        {/* Map legend */}
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-green-900/20">
          <div className="flex items-center gap-2 text-sm text-white mb-2">
            <div className="w-4 h-4 bg-green-600 rounded-full border border-white"></div>
            <span>Business Location</span>
          </div>
          <div className="text-xs text-gray-400">
            Click markers for details
          </div>
        </div>
      </div>
    </Card>
  );
}
