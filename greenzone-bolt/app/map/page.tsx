"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Map from '@/components/Map';
import type { MapboxViewportRequest } from '@/components/MapboxEmbed';
import { fetchDiscoveryVendorsPayload, type DiscoveryVendor } from '@/lib/publicVendors';
import {
  fetchVendorCoordsById,
  fetchVendorExtraLocationCoordsByVendorId,
  fetchVendorIdsServingZip5,
  type VendorExtraLocationCoord,
} from '@/lib/discoverMarketData';
import { batchResolveVendorMapPositions } from '@/lib/mapGeocode';
import {
  DEFAULT_MAP_CENTER,
  hashJitter,
  mapApproxCenterForShopperZip5,
  mapCenterForCaZipOrDefault,
} from '@/lib/mapCoordinates';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { trackEvent, trackSearch } from '@/lib/analytics';
import { readShopperGeo, readShopperZip5 } from '@/lib/shopperLocation';
import {
  collectVendorMapGeoPoints,
  minHaversineMilesFromShopper,
} from '@/lib/discoverSort';
import { publicDispensarySurfaceVisible } from '@/lib/publicDispensaryVisibility';
import { extractZip5 } from '@/lib/zipUtils';
import { vendorPremiseListingMarketAlignsWithShopper } from '@/lib/listingMarketSlugFromZip5';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, Star, Navigation, List, Map as MapIcon, Phone } from 'lucide-react';
import Link from 'next/link';
import { SocialEquityBadge } from '@/components/vendor/SocialEquityBadge';
import { PlatformAdSlot } from '@/components/ads/PlatformAdSlot';
import { listingHrefForVendor } from '@/lib/listingPath';
import { anyPinInViewport, type MapViewportBounds } from '@/lib/mapViewportBounds';
import { buildSmokersClubMapPinsPerMarket } from '@/lib/mapSmokersClubMapPins';

type Business = {
  id: string;
  /** CannaHub `vendors.slug` when present — used for public listing URLs. */
  slug?: string;
  /** Extra storefront pins from `vendor_locations` (public). */
  extra_map_locations?: Array<{ id: string; lat: number; lng: number; label: string | null }>;
  map_marker_image_url?: string | null;
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
  smokers_club_eligible?: boolean;
  map_visible_override?: boolean;
  social_equity_badge_visible?: boolean;
  online_menu_enabled?: boolean;
  total_reviews?: number;
  average_rating?: number;
  featured_until?: string | null;
};

function vendorMapGeoPointsForBusiness(b: Business) {
  return collectVendorMapGeoPoints(
    { lat: b.coordinates?.lat, lng: b.coordinates?.lng },
    b.extra_map_locations?.map((e) => ({ lat: e.lat, lng: e.lng }))
  );
}

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
  const vendorsSchema = useVendorsSchema();
  const viewportSeq = useRef(0);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewportRequest, setViewportRequest] = useState<MapboxViewportRequest | null>(null);
  /** Stable SSR/client first paint — synced from real shopper ZIP in useEffect (avoids hydration mismatch). */
  const [mapAnchor, setMapAnchor] = useState(() => DEFAULT_MAP_CENTER);
  const [geoLoading, setGeoLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [mapLane, setMapLane] = useState<MapLane>('both');
  const [liveBounds, setLiveBounds] = useState<MapViewportBounds | null>(null);
  const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deliveryToMyZip, setDeliveryToMyZip] = useState(false);
  const [myMetroOnly, setMyMetroOnly] = useState(false);
  const [deliveryZipVendorIds, setDeliveryZipVendorIds] = useState<Set<string>>(() => new Set());
  const [shopperZip5Display, setShopperZip5Display] = useState('');
  /** Geo or ZIP-derived anchor for “nearby” non–Smokers Club pins. */
  const [shopperAnchor, setShopperAnchor] = useState<{ lat: number; lng: number } | null>(null);

  const refreshShopperAnchor = useCallback(() => {
    const g = readShopperGeo();
    if (g) {
      setShopperAnchor({ lat: g.lat, lng: g.lng });
      return;
    }
    const p = mapApproxCenterForShopperZip5(readShopperZip5());
    setShopperAnchor(p ? { lat: p.lat, lng: p.lng } : null);
  }, []);

  useEffect(() => {
    refreshShopperAnchor();
    const on = () => refreshShopperAnchor();
    window.addEventListener('datreehouse:zip', on);
    window.addEventListener('datreehouse:geo', on);
    return () => {
      window.removeEventListener('datreehouse:zip', on);
      window.removeEventListener('datreehouse:geo', on);
    };
  }, [refreshShopperAnchor]);

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

  const laneToggleFiltered = useMemo(
    () =>
      businesses
        .filter((b) => matchesMapLane(b, mapLane))
        .filter((b) => passesListAndMapToggles(b, filters)),
    [businesses, mapLane, filters]
  );

  const clubDistanceFiltered = useMemo(() => {
    if (!vendorsSchema) return laneToggleFiltered;
    return laneToggleFiltered.filter((b) => {
      const eligible = b.smokers_club_eligible === true;
      const pts = vendorMapGeoPointsForBusiness(b);
      const distanceMiles =
        shopperAnchor && pts.length > 0
          ? minHaversineMilesFromShopper(shopperAnchor.lat, shopperAnchor.lng, pts)
          : undefined;
      return publicDispensarySurfaceVisible(eligible, {
        distanceMiles,
        inDeliveryZipCoverage: deliveryZipVendorIds.has(b.id),
        inMapViewport: liveBounds ? anyPinInViewport(pts, liveBounds) : false,
      });
    });
  }, [
    vendorsSchema,
    laneToggleFiltered,
    shopperAnchor,
    deliveryZipVendorIds,
    liveBounds,
  ]);

  /** Optional: only vendors with a `vendor_delivery_zip5` row for the site shopper ZIP. */
  const zipDeliveryFiltered = useMemo(() => {
    if (!deliveryToMyZip) return clubDistanceFiltered;
    if (deliveryZipVendorIds.size === 0) return [];
    return clubDistanceFiltered.filter((b) => deliveryZipVendorIds.has(b.id));
  }, [clubDistanceFiltered, deliveryToMyZip, deliveryZipVendorIds]);

  /** Same listing-market premise as Smokers Club (plus delivery-ZIP override). */
  const regionFiltered = useMemo(() => {
    if (!myMetroOnly) return zipDeliveryFiltered;
    const sz =
      extractZip5(shopperZip5Display) ?? extractZip5(readShopperZip5() ?? '') ?? '';
    if (sz.length !== 5) return zipDeliveryFiltered;
    return zipDeliveryFiltered.filter((b) => {
      if (deliveryZipVendorIds.has(b.id)) return true;
      const vz = extractZip5(b.zip_code);
      if (!vz || vz.length !== 5) return false;
      return vendorPremiseListingMarketAlignsWithShopper(sz, vz);
    });
  }, [zipDeliveryFiltered, myMetroOnly, shopperZip5Display, deliveryZipVendorIds]);

  /** Pins + list: lane/toggles, optional filters, then live map viewport. */
  const mapBusinesses = useMemo(() => {
    if (!liveBounds) return regionFiltered;
    return regionFiltered.filter((b) => anyPinInViewport(vendorMapGeoPointsForBusiness(b), liveBounds));
  }, [regionFiltered, liveBounds]);

  /** One Map row per map pin (primary + `vendor_locations`) for unique marker keys and popups. */
  const mapPinRowsForMap = useMemo(
    () =>
      mapBusinesses.flatMap((b) => {
        const listingHref = listingHrefForVendor({ id: b.id, slug: b.slug });
        const base = {
          vendorId: b.id,
          address: b.address,
          city: b.city,
          rating: Number(b.average_rating ?? 0),
          logo_url: b.logo_url,
          map_marker_image_url: b.map_marker_image_url ?? null,
          offers_delivery: b.offers_delivery,
          offers_storefront: b.offers_storefront,
          active_deals_count: b.active_deals_count,
          online_menu_enabled: b.online_menu_enabled,
          listingHref,
        };
        const out: Array<{
          id: string;
          markerKey: string;
          vendorId: string;
          name: string;
          address: string;
          city: string;
          rating: number;
          logo_url: string;
          map_marker_image_url: string | null;
          offers_delivery: boolean;
          offers_storefront: boolean;
          active_deals_count: number;
          online_menu_enabled?: boolean;
          coordinates: { lat: number; lng: number };
          locationLabel: string | null;
          listingHref: string;
        }> = [];
        if (
          b.coordinates &&
          Number.isFinite(b.coordinates.lat) &&
          Number.isFinite(b.coordinates.lng)
        ) {
          out.push({
            ...base,
            id: `${b.id}:primary`,
            markerKey: `${b.id}:primary`,
            name: b.business_name,
            coordinates: b.coordinates,
            locationLabel: null,
            listingHref,
          });
        }
        for (const ex of b.extra_map_locations ?? []) {
          if (!Number.isFinite(ex.lat) || !Number.isFinite(ex.lng)) continue;
          const label = ex.label?.trim();
          out.push({
            ...base,
            id: `${b.id}:loc:${ex.id}`,
            markerKey: `${b.id}:loc:${ex.id}`,
            name: label ? `${b.business_name} (${label})` : b.business_name,
            coordinates: { lat: ex.lat, lng: ex.lng },
            locationLabel: ex.label,
            listingHref,
          });
        }
        return out;
      }),
    [mapBusinesses]
  );

  useEffect(() => {
    applyFilters();
  }, [mapBusinesses, searchQuery]);

  useEffect(() => {
    return () => {
      if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
    };
  }, []);

  const onViewportBoundsChange = useCallback((b: MapViewportBounds) => {
    if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
    boundsDebounceRef.current = setTimeout(() => {
      boundsDebounceRef.current = null;
      setLiveBounds(b);
    }, 200);
  }, []);

  const refreshDeliveryZipVendorIds = useCallback(async () => {
    const z = readShopperZip5();
    setShopperZip5Display(z ?? '');
    const s = await fetchVendorIdsServingZip5(z);
    setDeliveryZipVendorIds(s);
  }, []);

  useEffect(() => {
    void refreshDeliveryZipVendorIds();
  }, [refreshDeliveryZipVendorIds]);

  async function loadBusinesses() {
    try {
      setLoading(true);

      const { vendors: list } = await fetchDiscoveryVendorsPayload({ audience: 'directory' });
      // Directory pool (includes delivery-only / no-photo listings). Pins: green storefront, red delivery-only (MapboxEmbed).
      // Shopper ZIP still sets the default map center only — pan/zoom + viewport filter picks pins.
      let merged = list;

      const extrasByVendor: Map<string, VendorExtraLocationCoord[]> =
        merged.length > 0
          ? await fetchVendorExtraLocationCoordsByVendorId()
          : new globalThis.Map();

      if (vendorsSchema && merged.length > 0) {
        const coordsById = await fetchVendorCoordsById();
        merged = merged.map((v) => {
          const c = coordsById.get(v.id);
          if (!c) return { ...v };
          return {
            ...v,
            geo_lat: c.geo_lat ?? v.geo_lat,
            geo_lng: c.geo_lng ?? v.geo_lng,
            map_marker_image_url: c.map_marker_image_url ?? v.map_marker_image_url,
          };
        });
      }

      const positions = await batchResolveVendorMapPositions(merged as DiscoveryVendor[], (v) => {
        const anchor = mapCenterForCaZipOrDefault(v.zip);
        return hashJitter(v.id, v.zip, anchor);
      });

      const businessesWithCoords = merged.map((business) => {
        const dv = business as DiscoveryVendor;
        const pinLogo = (dv.logo_url ?? '').trim();
        const pt = positions.get(business.id);
        const fallback = (() => {
          const anchor = mapCenterForCaZipOrDefault(business.zip);
          return hashJitter(business.id, business.zip, anchor);
        })();
        const lat = pt?.lat ?? fallback.lat;
        const lng = pt?.lng ?? fallback.lng;
        const extras = extrasByVendor.get(business.id);
        const extra_map_locations =
          extras && extras.length > 0
            ? extras.map((e: VendorExtraLocationCoord) => ({
                id: e.id,
                lat: e.lat,
                lng: e.lng,
                label: e.label,
              }))
            : undefined;
        return {
          id: business.id,
          slug: dv.slug,
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
          logo_url: pinLogo,
          map_marker_image_url: dv.map_marker_image_url ?? null,
          is_verified: true,
          is_approved: true,
          plan_type: 'basic',
          profile_views: 0,
          coordinates: { lat, lng },
          extra_map_locations,
          offers_delivery: dv.offers_delivery,
          offers_storefront: dv.offers_storefront,
          active_deals_count: dv.active_deals_count ?? 0,
          smokers_club_eligible: dv.smokers_club_eligible === true,
          map_visible_override: dv.map_visible_override === true,
          social_equity_badge_visible: dv.social_equity_badge_visible === true,
          online_menu_enabled: dv.online_menu_enabled,
          total_reviews: dv.total_reviews ?? 0,
          average_rating: dv.average_rating ?? 0,
          featured_until: dv.featured_until ?? null,
        };
      }) satisfies Business[];

      let forUi = businessesWithCoords;
      if (vendorsSchema) {
        const clubOnly = forUi.filter((b) => b.smokers_club_eligible === true);
        forUi = buildSmokersClubMapPinsPerMarket(clubOnly);
      }

      setBusinesses(forUi);
      setFilteredBusinesses(forUi);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  // Keep map centered on the site shopper ZIP (not the centroid of pins, which can skew to e.g. the US midwest).
  useEffect(() => {
    const syncAnchor = () => setMapAnchor(mapApproxCenterForShopperZip5(readShopperZip5()));
    syncAnchor();
    const onZip = () => {
      setLiveBounds(null);
      syncAnchor();
      void refreshDeliveryZipVendorIds();
      viewportSeq.current += 1;
      const c = mapApproxCenterForShopperZip5(readShopperZip5());
      setViewportRequest({
        kind: 'flyTo',
        longitude: c.lng,
        latitude: c.lat,
        zoom: 10,
        trigger: viewportSeq.current,
      });
    };
    window.addEventListener('datreehouse:zip', onZip);
    return () => window.removeEventListener('datreehouse:zip', onZip);
  }, [refreshDeliveryZipVendorIds]);

  function applyFilters() {
    let forList = mapBusinesses;
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
    setLiveBounds(null);
    const c = mapApproxCenterForShopperZip5(readShopperZip5());
    setMapAnchor(c);
    viewportSeq.current += 1;
    setViewportRequest({
      kind: 'flyTo',
      longitude: c.lng,
      latitude: c.lat,
      zoom: 10,
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
        setLiveBounds(null);
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
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-4">Smokers Club map</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 pb-4">
        <PlatformAdSlot placementKey="map" stripLabel="Featured on map" />
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
            <Button
              type="submit"
              className="min-h-11 shrink-0 bg-green-600 text-white hover:bg-green-700 sm:min-h-10"
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0 border-green-900/20 text-white hover:bg-green-500/10 sm:min-h-10"
              disabled={geoLoading}
              onClick={handleUseMyLocation}
            >
              <Navigation className="mr-2 h-5 w-5" />
              {geoLoading ? 'Locating…' : 'My location'}
            </Button>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('map')}
                className={`min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 ${viewMode === 'map' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}`}
              >
                <MapIcon className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={`min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 ${viewMode === 'list' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}`}
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-green-900/20 pt-4">
            <Button type="button" variant="outline" className="border-green-900/20 text-white" onClick={handleResetMapView}>
              Reset map view
            </Button>
            {viewMode === 'map' && businesses.length > 0 ? (
              <span className="text-xs text-gray-500">
                {liveBounds ? `${mapBusinesses.length} in map window · ` : 'Move the map to filter by view · '}
                {businesses.length} live listings loaded
              </span>
            ) : null}
          </div>
          {viewMode === 'map' ? (
            <p className="mt-2 text-xs text-gray-500">
              Pan and zoom: pins and the list show live listings in the map window. Turn on{' '}
              <span className="font-medium text-gray-400">Deliver to my ZIP</span> to narrow to shops with delivery
              configured for your site ZIP. Header ZIP still sets where the map opens.
            </p>
          ) : null}

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
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">
                Pin colors follow <span className="font-medium text-gray-400">public listing lanes</span> (how each
                shop appears in discovery), not whether they have a physical counter. A full street address with default
                admin rules often shows storefront-only unless the vendor is set to allow both lanes or a delivery
                override.
              </p>
              <div className="flex flex-wrap gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  Directory (no menu)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-emerald-400 bg-emerald-500/20" />
                  Storefront lane (green)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-red-500 bg-red-500/20" />
                  Delivery lane (red)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-violet-400 bg-violet-500/25 shadow-[0_0_8px_rgba(167,139,250,0.45)]" />
                  Both lanes (violet)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/60 ring-offset-2 ring-offset-black" />
                  Active deal (amber ring)
                </span>
              </div>
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

          <div className="mt-4 flex flex-col gap-2 border-t border-green-900/20 pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="deliverToMyZip"
                checked={deliveryToMyZip}
                onCheckedChange={(checked) => {
                  setDeliveryToMyZip(checked);
                  if (!checked) return;
                  void (async () => {
                    const z = readShopperZip5();
                    setShopperZip5Display(z ?? '');
                    const s = await fetchVendorIdsServingZip5(z);
                    setDeliveryZipVendorIds(s);
                    if (s.size === 0) {
                      toast({
                        title: 'No delivery coverage rows',
                        description: `No vendors in the directory have delivery configured for ZIP ${z ?? '—'} yet.`,
                      });
                    }
                  })();
                }}
              />
              <Label htmlFor="deliverToMyZip" className="cursor-pointer text-white">
                Deliver to my ZIP
              </Label>
            </div>
            <p className="max-w-xl text-xs text-gray-500">
              When on, only shops with an explicit delivery zone for your site ZIP ({shopperZip5Display || '—'}) stay
              on the map and list. Change ZIP in the header to refresh. Pan/zoom still limits by map window.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-green-900/20 pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="myMetroOnly"
                checked={myMetroOnly}
                onCheckedChange={(checked) => setMyMetroOnly(checked)}
              />
              <Label htmlFor="myMetroOnly" className="cursor-pointer text-white">
                My metro only
              </Label>
            </div>
            <p className="max-w-xl text-xs text-gray-500">
              Hides pins outside your saved ZIP&apos;s listing market (same rule as Smokers Club / discover). Shops that
              explicitly deliver to your ZIP still appear. Set ZIP in the header.
            </p>
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
                anchorCenter={mapAnchor}
                anchorZoom={10}
                viewportRequest={viewportRequest}
                onViewportBoundsChange={onViewportBoundsChange}
                businesses={mapPinRowsForMap.map((row) => ({
                  id: row.markerKey,
                  vendorId: row.vendorId,
                  name: row.name,
                  address: row.address,
                  city: row.city,
                  rating: row.rating,
                  coordinates: row.coordinates,
                  logo_url: row.logo_url,
                  map_marker_image_url: row.map_marker_image_url,
                  offers_delivery: row.offers_delivery,
                  offers_storefront: row.offers_storefront,
                  active_deals_count: row.active_deals_count,
                  online_menu_enabled: row.online_menu_enabled,
                  locationLabel: row.locationLabel,
                  listingHref: row.listingHref,
                }))}
                onBusinessClick={(business) => {
                  const vid = business.vendorId ?? business.id;
                  const fullBusiness = businesses.find((b) => b.id === vid);
                  if (fullBusiness) void handleBusinessClick(fullBusiness);
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
                        handleResetMapView();
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
                              {(business.business_name.trim().charAt(0) || '?').toUpperCase()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <Link href={listingHrefForVendor({ id: business.id, slug: business.slug })}>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-bold text-white hover:text-green-500 transition">
                                      {business.business_name}
                                    </h3>
                                    {business.social_equity_badge_visible && (
                                      <SocialEquityBadge className="text-[10px]" />
                                    )}
                                  </div>
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
                                <span className="text-white font-semibold">
                                  {(business.average_rating ?? 0) > 0
                                    ? (business.average_rating as number).toFixed(1)
                                    : '—'}
                                </span>
                                <span>({business.total_reviews ?? 0} reviews)</span>
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
                              <Link href={listingHrefForVendor({ id: business.id, slug: business.slug })}>
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
