"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Map from '@/components/Map';
import type { MapboxViewportRequest } from '@/components/MapboxEmbed';
import { fetchDiscoveryVendors, type DiscoveryVendor } from '@/lib/publicVendors';
import { fetchVendorCoordsById } from '@/lib/discoverMarketData';
import { hashJitter, mapCenterForCaZipOrDefault } from '@/lib/mapCoordinates';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { trackEvent, trackSearch } from '@/lib/analytics';
import { readShopperZip5 } from '@/lib/shopperLocation';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { fetchApprovedVendorIdsForMarket } from '@/lib/discoverMarketData';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import {
  Search, MapPin, Star, Clock, Navigation, Heart,
  Filter, List, Map as MapIcon, Phone, Globe
} from 'lucide-react';
import Link from 'next/link';

type Business = {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  logo_url: string;
  is_verified: boolean;
  is_approved: boolean;
  plan_type: string;
  profile_views: number;
  coordinates?: { lat: number; lng: number };
  offers_delivery: boolean;
  offers_storefront: boolean;
  active_deals_count: number;
};

type MapLane = 'both' | 'storefront' | 'delivery';

function matchesMapLane(b: Business, lane: MapLane): boolean {
  if (lane === 'both') return true;
  if (lane === 'storefront') return b.offers_storefront;
  return b.offers_delivery && !b.offers_storefront;
}

function isBusinessOpenNow(_vendorId: string): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 22;
}

function passesListAndMapToggles(
  b: Business,
  f: {
    openNow: boolean;
    hasDeals: boolean;
    hasDelivery: boolean;
    topRated: boolean;
    businessType: 'all' | 'dispensary' | 'delivery' | 'brand';
  }
): boolean {
  if (f.openNow && !isBusinessOpenNow(b.id)) return false;
  if (f.hasDeals && b.active_deals_count <= 0) return false;
  if (f.hasDelivery && !b.offers_delivery) return false;
  if (f.topRated && !b.is_verified) return false;
  if (f.businessType !== 'all' && b.business_type !== f.businessType) return false;
  return true;
}

export default function MapPage() {
  const { toast } = useToast();
  const { isVendor, isAdmin } = useRole();
  const viewportSeq = useRef(0);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewportRequest, setViewportRequest] = useState<MapboxViewportRequest | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [mapLane, setMapLane] = useState<MapLane>('both');

  const [filters, setFilters] = useState({
    openNow: false,
    hasDeals: false,
    hasDelivery: false,
    topRated: false,
    businessType: 'all' as 'all' | 'dispensary' | 'delivery' | 'brand'
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [businesses, searchQuery, filters, mapLane]);

  /** Pins: lane + toggles only — text search and “go to location” do not remove markers. */
  const mapBusinesses = useMemo(
    () =>
      businesses
        .filter((b) => matchesMapLane(b, mapLane))
        .filter((b) => passesListAndMapToggles(b, filters)),
    [businesses, mapLane, filters]
  );

  async function loadBusinesses() {
    try {
      setLoading(true);

      const list = await fetchDiscoveryVendors();

      let merged = list;
      if (isVendorsSchema() && !isVendor && !isAdmin) {
        // Customer-only: only show stores that the current ZIP's market is approved for,
        // mirroring the "Areas" toggles in the vendor setup.
        const zip5 = readShopperZip5() ?? '';
        if (zip5) {
          const market = await getMarketForSmokersClub(zip5);
            if (!market) {
              merged = [];
            } else {
              const approvedIds = await fetchApprovedVendorIdsForMarket(market.id);
              merged = merged.filter((v) => approvedIds.has(v.id));
            }
        } else {
          merged = [];
        }

        const coordsById = await fetchVendorCoordsById();
        merged = merged.map((v) => {
          const c = coordsById.get(v.id);
          if (!c) return { ...v };
          return {
            ...v,
            geo_lat: c.geo_lat ?? v.geo_lat,
            geo_lng: c.geo_lng ?? v.geo_lng,
            map_marker_image_url: c.map_marker_image_url ?? v.map_marker_image_url,
            logo_url: v.logo_url || c.logo_url || undefined,
          };
        });
      }

      const businessesWithCoords = merged.map((business) => {
        const dv = business as DiscoveryVendor;
        let lat: number;
        let lng: number;
        if (
          business.geo_lat != null &&
          business.geo_lng != null &&
          Number.isFinite(business.geo_lat) &&
          Number.isFinite(business.geo_lng)
        ) {
          lat = business.geo_lat;
          lng = business.geo_lng;
        } else {
          const anchor = mapCenterForCaZipOrDefault(business.zip);
          const j = hashJitter(business.id, business.zip, anchor);
          lat = j.lat;
          lng = j.lng;
        }
        return {
          id: business.id,
          user_id: business.user_id ?? '',
          business_name: business.business_name,
          business_type: 'dispensary',
          description: '',
          address: business.address?.trim() ?? '',
          city: business.city,
          state: business.state,
          zip_code: business.zip ?? '',
          phone: '',
          website: '',
          logo_url: business.logo_url ?? '',
          is_verified: true,
          is_approved: true,
          plan_type: 'basic',
          profile_views: 0,
          coordinates: { lat, lng },
          offers_delivery: dv.offers_delivery,
          offers_storefront: dv.offers_storefront,
          active_deals_count: dv.active_deals_count ?? 0,
        };
      }) satisfies Business[];

      setBusinesses(businessesWithCoords);
      setFilteredBusinesses(businessesWithCoords);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  // When customers allow location / change ZIP, reload the customer-visible area-gated list.
  useEffect(() => {
    if (!isVendorsSchema() || isVendor || isAdmin) return;
    const onZip = () => void loadBusinesses();
    window.addEventListener('datreehouse:zip', onZip);
    return () => window.removeEventListener('datreehouse:zip', onZip);
  }, [isVendor, isAdmin]);

  function applyFilters() {
    const laneAndToggles = businesses
      .filter((b) => matchesMapLane(b, mapLane))
      .filter((b) => passesListAndMapToggles(b, filters));

    let forList = laneAndToggles;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      forList = forList.filter(
        (b) =>
          b.business_name.toLowerCase().includes(query) ||
          b.address.toLowerCase().includes(query) ||
          b.city.toLowerCase().includes(query) ||
          b.state.toLowerCase().includes(query) ||
          b.zip_code.includes(query)
      );
    }

    setFilteredBusinesses(forList);

    if (searchQuery) {
      trackSearch(searchQuery, 'map_search', '', filters, forList.length);
    }
  }

  async function handleBusinessClick(business: Business) {
    await trackEvent({
      eventType: 'map_pin_click',
      vendorId: business.id,
      metadata: { business_name: business.business_name }
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function handleResetMapView() {
    viewportSeq.current += 1;
    setViewportRequest({
      kind: 'flyTo',
      longitude: -119.5,
      latitude: 36.5,
      zoom: 5.5,
      trigger: viewportSeq.current,
    });
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        viewportSeq.current += 1;
        setViewportRequest({
          kind: 'flyTo',
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          zoom: 11,
          trigger: viewportSeq.current,
        });
        toast({ title: 'Map moved to your location' });
      },
      () => {
        setGeoLoading(false);
        toast({
          title: 'Could not get location',
          description: 'Allow location access in your browser, or set your ZIP in the bar under the main menu.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-4">Map Search</h1>
          <p className="text-gray-400">
            Green pins are storefronts; red pins are delivery-only (no storefront). Both / Storefront / Delivery and the
            switches below update the map and the list. The shop search only narrows the list — it does not remove pins.
            Use <strong className="text-gray-300">My location</strong> below to move the map, or set ZIP in the top
            menu bar site-wide.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="relative min-w-0 flex-1 md:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Filter the list: name, address, city, or ZIP…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-green-900/20 bg-gray-800 pl-10 text-white"
              />
            </div>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white shrink-0">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 border-green-900/20 text-white hover:bg-green-500/10"
              disabled={geoLoading}
              onClick={handleUseMyLocation}
            >
              <Navigation className="mr-2 h-5 w-5" />
              {geoLoading ? 'Locating…' : 'My location'}
            </Button>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('map')}
                className={viewMode === 'map' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}
              >
                <MapIcon className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-green-900/20 pt-4">
            <Button type="button" variant="outline" className="border-green-900/20 text-white" onClick={handleResetMapView}>
              Reset map view
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-green-900/20 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-sm text-gray-400">Map &amp; list:</span>
              <div className="flex flex-wrap gap-2">
                {(['both', 'storefront', 'delivery'] as const).map((lane) => (
                  <Button
                    key={lane}
                    type="button"
                    size="sm"
                    variant={mapLane === lane ? 'default' : 'outline'}
                    className={
                      mapLane === lane
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'border-green-900/20 text-white hover:bg-green-500/10'
                    }
                    onClick={() => setMapLane(lane)}
                  >
                    {lane === 'both' ? 'Both' : lane === 'storefront' ? 'Storefronts' : 'Delivery only'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-emerald-400 bg-emerald-500/20" />
                Storefront (green)
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-red-500 bg-red-500/20" />
                Delivery only (red)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-green-900/20">
            <div className="flex items-center gap-2">
              <Switch
                id="openNow"
                checked={filters.openNow}
                onCheckedChange={(checked) => setFilters({ ...filters, openNow: checked })}
              />
              <Label htmlFor="openNow" className="text-white cursor-pointer">
                Open Now
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="hasDeals"
                checked={filters.hasDeals}
                onCheckedChange={(checked) => setFilters({ ...filters, hasDeals: checked })}
              />
              <Label htmlFor="hasDeals" className="text-white cursor-pointer">
                Has Deals
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="hasDelivery"
                checked={filters.hasDelivery}
                onCheckedChange={(checked) => setFilters({ ...filters, hasDelivery: checked })}
              />
              <Label htmlFor="hasDelivery" className="text-white cursor-pointer">
                Delivery
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="topRated"
                checked={filters.topRated}
                onCheckedChange={(checked) => setFilters({ ...filters, topRated: checked })}
              />
              <Label htmlFor="topRated" className="text-white cursor-pointer">
                Verified Only
              </Label>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
            <p className="text-gray-400">Loading businesses...</p>
          </Card>
        ) : (
          <>
            {viewMode === 'map' ? (
              <Map
                viewportRequest={viewportRequest}
                businesses={mapBusinesses.map((b) => ({
                  id: b.id,
                  name: b.business_name,
                  address: b.address,
                  city: b.city,
                  rating: 4.5,
                  coordinates: b.coordinates,
                  logo_url: b.logo_url,
                  offers_delivery: b.offers_delivery,
                  offers_storefront: b.offers_storefront,
                }))}
                onBusinessClick={(business) => {
                  const fullBusiness = businesses.find((b) => b.id === business.id);
                  if (fullBusiness) {
                    handleBusinessClick(fullBusiness);
                    window.location.href = `/listing/${fullBusiness.id}`;
                  }
                }}
              />
            ) : (
              <div className="space-y-4">
                {filteredBusinesses.length === 0 ? (
                  <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
                    <MapPin className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Results Found</h3>
                    <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
                    <Button
                      onClick={() => {
                        setSearchQuery('');
                        setMapLane('both');
                        setFilters({
                          openNow: false,
                          hasDeals: false,
                          hasDelivery: false,
                          topRated: false,
                          businessType: 'all'
                        });
                        viewportSeq.current += 1;
                        setViewportRequest({
                          kind: 'flyTo',
                          longitude: -119.5,
                          latitude: 36.5,
                          zoom: 5.5,
                          trigger: viewportSeq.current,
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Clear Filters
                    </Button>
                  </Card>
                ) : (
                  filteredBusinesses.map((business) => (
                    <Card key={business.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all">
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-green-900/30 rounded-lg flex items-center justify-center border border-green-600/30 flex-shrink-0">
                            <span className="text-2xl font-bold text-green-500">
                              {business.business_name.charAt(0)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <Link href={`/listing/${business.id}`}>
                                  <h3 className="text-lg font-bold text-white hover:text-green-500 transition">
                                    {business.business_name}
                                  </h3>
                                </Link>
                                {business.is_verified && (
                                  <Badge className="bg-green-600/20 text-green-500 border-green-600/30 mt-1">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              {business.plan_type !== 'basic' && (
                                <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30">
                                  {business.plan_type}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-white font-semibold">4.5</span>
                                <span>(120)</span>
                              </div>
                              <span>•</span>
                              <span className="capitalize">{business.business_type}</span>
                            </div>

                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                              {business.description || 'Premium cannabis products and services'}
                            </p>

                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                              <MapPin className="h-4 w-4" />
                              <span>{business.address}, {business.city}, {business.state}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link href={`/listing/${business.id}`}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  View Details
                                </Button>
                              </Link>
                              {business.phone && (
                                <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </Button>
                              )}
                              {business.website && (
                                <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                  <Globe className="h-4 w-4 mr-1" />
                                  Website
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                <Navigation className="h-4 w-4 mr-1" />
                                Directions
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
