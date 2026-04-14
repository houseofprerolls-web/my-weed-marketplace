"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, MapPin, Star, Clock, DollarSign, Phone, Navigation, Heart, Award, CircleCheck as CheckCircle } from 'lucide-react';
import { fetchVendorsAsVendorProfiles } from '@/lib/publicVendors';
import { VendorProfile } from '@/lib/types/database';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { fetchVendorIdsServingZip5 } from '@/lib/discoverMarketData';
import { publicDispensarySurfaceVisible } from '@/lib/publicDispensaryVisibility';
import { SocialEquityBadge } from '@/components/vendor/SocialEquityBadge';
import { fetchVendorCoordsById } from '@/lib/discoverMarketData';
import { haversineKm } from '@/lib/discoverSort';
import { hashJitter, mapCenterForCaZipOrDefault } from '@/lib/mapCoordinates';
import { batchResolveVendorGeocodePositions } from '@/lib/mapGeocode';
import { readShopperGeo, readShopperZip5 } from '@/lib/shopperLocation';
import { resolveShopperPointForDistance } from '@/lib/shopperZipGeocode';
import { cn } from '@/lib/utils';
import { TreehouseSmokingLoader } from '@/components/TreehouseSmokingLoader';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { PlatformAdSlot } from '@/components/ads/PlatformAdSlot';
import {
  DIRECTORY_CHIP_META,
  type DirectoryChipId,
  filterDirectoryByChips,
  filterDirectoryBySearchQuery,
} from '@/lib/dispensaryDirectoryFilters';
import { listingHrefForVendor } from '@/lib/listingPath';

const DEFAULT_SIDEBAR_FILTERS = {
  openNow: false,
  hasDeals: false,
  delivery: false,
  minRating: 0,
  maxDistance: 15,
};

function DispensariesPageInner() {
  const vendorsSchema = useVendorsSchema();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChips, setActiveChips] = useState<Set<DirectoryChipId>>(() => new Set());
  const [sortBy, setSortBy] = useState<'nearest' | 'rating' | 'reviews'>('rating');
  const [businesses, setBusinesses] = useState<VendorProfile[]>([]);
  const [coordById, setCoordById] = useState<Map<string, { lat: number; lng: number }>>(() => new Map());
  /** Merged DB + Mapbox geocode for list distances (matches map when token is set). */
  const [displayCoordById, setDisplayCoordById] = useState<Map<string, { lat: number; lng: number }>>(() => new Map());
  const [shopperLat, setShopperLat] = useState<number | null>(null);
  const [shopperLng, setShopperLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState(DEFAULT_SIDEBAR_FILTERS);
  const [deliveryZipVendorIds, setDeliveryZipVendorIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!vendorsSchema) {
      setDeliveryZipVendorIds(new Set());
      return;
    }
    const z = readShopperZip5();
    let cancelled = false;
    void (async () => {
      const s = await fetchVendorIdsServingZip5(z);
      if (!cancelled) setDeliveryZipVendorIds(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsSchema]);

  useEffect(() => {
    const s = searchParams.get('sort');
    if (s === 'nearest') setSortBy('nearest');
  }, [searchParams]);

  useEffect(() => {
    const q = searchParams.get('q')?.trim() ?? '';
    if (q) setSearchTerm(q);
  }, [searchParams]);

  const resetDirectoryFilters = useCallback(() => {
    setFilters({ ...DEFAULT_SIDEBAR_FILTERS });
    setActiveChips(new Set());
    setSearchTerm('');
  }, []);

  const toggleChip = useCallback((id: DirectoryChipId) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const refreshShopperPoint = useCallback(async () => {
    const geo = readShopperGeo();
    if (geo) {
      setShopperLat(geo.lat);
      setShopperLng(geo.lng);
      return;
    }
    const pt = await resolveShopperPointForDistance(readShopperZip5());
    setShopperLat(pt.lat);
    setShopperLng(pt.lng);
  }, []);

  useEffect(() => {
    void refreshShopperPoint();
    const onZip = () => void refreshShopperPoint();
    const onGeo = () => void refreshShopperPoint();
    window.addEventListener('datreehouse:zip', onZip);
    window.addEventListener('datreehouse:geo', onGeo);
    return () => {
      window.removeEventListener('datreehouse:zip', onZip);
      window.removeEventListener('datreehouse:geo', onGeo);
    };
  }, [refreshShopperPoint]);

  useEffect(() => {
    if (!vendorsSchema) return;
    const onZip = () => {
      void (async () => {
        const s = await fetchVendorIdsServingZip5(readShopperZip5());
        setDeliveryZipVendorIds(s);
      })();
    };
    window.addEventListener('datreehouse:zip', onZip);
    window.addEventListener('storage', onZip);
    return () => {
      window.removeEventListener('datreehouse:zip', onZip);
      window.removeEventListener('storage', onZip);
    };
  }, [vendorsSchema]);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchVendorsAsVendorProfiles();
        setBusinesses(data);

        const coords = await fetchVendorCoordsById();
        const m = new Map<string, { lat: number; lng: number }>();
        coords.forEach((row, id) => {
          if (row.geo_lat != null && row.geo_lng != null) {
            m.set(id, { lat: row.geo_lat, lng: row.geo_lng });
          }
        });
        setCoordById(m);
        void refreshShopperPoint();
      } catch (err) {
        console.error('Error loading businesses:', err);
        setError('Failed to load dispensaries. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadBusinesses();
  }, [refreshShopperPoint]);

  useEffect(() => {
    if (businesses.length === 0) {
      setDisplayCoordById(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = businesses.map((b) => ({
        id: b.id,
        address: b.address,
        city: b.city ?? '',
        state: b.state ?? '',
        zip: b.zip_code ?? undefined,
        zip_code: b.zip_code ?? undefined,
        geo_lat: coordById.get(b.id)?.lat ?? null,
        geo_lng: coordById.get(b.id)?.lng ?? null,
      }));
      const geo = await batchResolveVendorGeocodePositions(rows, (v) => {
        const z = v.zip ?? v.zip_code ?? '';
        const anchor = mapCenterForCaZipOrDefault(z);
        return hashJitter(v.id, z, anchor);
      });
      if (!cancelled) setDisplayCoordById(geo);
    })();
    return () => {
      cancelled = true;
    };
  }, [businesses, coordById]);

  const distanceMi = useCallback(
    (id: string): number | undefined => {
      if (shopperLat == null || shopperLng == null) return undefined;
      const c = displayCoordById.get(id) ?? coordById.get(id);
      if (!c) return undefined;
      return haversineKm(shopperLat, shopperLng, c.lat, c.lng) * 0.621371;
    },
    [shopperLat, shopperLng, coordById, displayCoordById]
  );

  const filteredBusinesses = useMemo(() => {
    let list = filterDirectoryBySearchQuery(businesses, searchTerm);
    list = filterDirectoryByChips(list, activeChips);
    return list.filter((b) => {
      if (filters.hasDeals && (!b.active_deals_count || b.active_deals_count === 0)) return false;
      if (filters.minRating && b.average_rating && b.average_rating < filters.minRating) return false;
      if (filters.delivery && !b.offers_delivery) return false;
      if (vendorsSchema) {
        if (b.map_visible_override === true) return true;
        const eligible = b.smokers_club_eligible === true;
        const d = distanceMi(b.id);
        if (
          !publicDispensarySurfaceVisible(eligible, {
            distanceMiles: d,
            maxDistanceMiles: filters.maxDistance,
            inDeliveryZipCoverage: deliveryZipVendorIds.has(b.id),
          })
        ) {
          return false;
        }
      }
      return true;
    });
  }, [businesses, searchTerm, activeChips, filters, vendorsSchema, distanceMi, deliveryZipVendorIds]);

  const sortedBusinesses = useMemo(() => {
    const arr = [...filteredBusinesses];
    if (sortBy === 'nearest') {
      arr.sort((a, b) => {
        const da = distanceMi(a.id);
        const db = distanceMi(b.id);
        if (da != null && db != null && da !== db) return da - db;
        if (da != null && db == null) return -1;
        if (da == null && db != null) return 1;
        return a.business_name.localeCompare(b.business_name);
      });
      return arr;
    }
    if (sortBy === 'rating') {
      arr.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      return arr;
    }
    arr.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
    return arr;
  }, [filteredBusinesses, sortBy, shopperLat, shopperLng, coordById, displayCoordById, distanceMi]);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-12 border-b border-green-900/20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Dispensaries & Delivery Services
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-6">
        <PlatformAdSlot placementKey="dispensaries" stripLabel="Featured dispensaries" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80 space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-green-500" />
                  Filters
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetDirectoryFilters}
                  className="text-green-500 hover:text-green-400"
                >
                  Clear All
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasDeals"
                    checked={filters.hasDeals}
                    onCheckedChange={(checked) => setFilters({...filters, hasDeals: !!checked})}
                    className="border-green-900/20"
                  />
                  <label htmlFor="hasDeals" className="text-gray-300 text-sm cursor-pointer">
                    Has Deals
                  </label>
                  <Badge className="ml-auto bg-green-600/20 text-green-500 border-green-600/30">
                    {businesses.filter(b => b.active_deals_count && b.active_deals_count > 0).length}
                  </Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delivery"
                    checked={filters.delivery}
                    onCheckedChange={(checked) => setFilters({...filters, delivery: !!checked})}
                    className="border-green-900/20"
                  />
                  <label htmlFor="delivery" className="text-gray-300 text-sm cursor-pointer">
                    Delivery Available
                  </label>
                  <Badge className="ml-auto bg-green-600/20 text-green-500 border-green-600/30">
                    {businesses.filter(b => b.offers_delivery).length}
                  </Badge>
                </div>

                <div className="pt-4 border-t border-green-900/20">
                  <label className="text-gray-300 text-sm mb-2 block">Minimum Rating</label>
                  <Select
                    value={filters.minRating.toString()}
                    onValueChange={(value) => setFilters({...filters, minRating: Number(value)})}
                  >
                    <SelectTrigger className="bg-gray-800 border-green-900/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-green-900/20">
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <div className="mb-5 space-y-2">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/85">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
                  aria-hidden
                />
                Quick filters
              </p>
              <div className="-mx-1 flex flex-wrap gap-2 px-1">
                {DIRECTORY_CHIP_META.map(({ id, label }) => {
                  const on = activeChips.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleChip(id)}
                      className={cn(
                        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        on
                          ? 'border-brand-red/50 bg-brand-red/20 text-white shadow-sm'
                          : 'border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-600 hover:bg-gray-900'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search name, city, address, or ZIP"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900 border-green-900/20 text-white h-11 rounded-xl"
                />
              </div>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as 'nearest' | 'rating' | 'reviews')}
              >
                <SelectTrigger className="w-48 bg-gray-900 border-green-900/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-green-900/20">
                  <SelectItem value="nearest">Nearest</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="reviews">Most Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <Card className="bg-gray-900 border-green-900/20 p-8 text-center">
                <TreehouseSmokingLoader label="Loading dispensaries…" compact />
              </Card>
            ) : error ? (
              <Card className="bg-gray-900 border-red-900/20 p-12 text-center">
                <p className="text-red-400 text-lg mb-4">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Retry
                </Button>
              </Card>
            ) : sortedBusinesses.length === 0 ? (
              <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
                <p className="mb-4 text-lg text-zinc-200">No matches</p>
                <Button onClick={resetDirectoryFilters} className="bg-green-600 hover:bg-green-700 text-white">
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedBusinesses.map((business) => (
                  <Card key={business.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all">
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-950/35">
                          {business.logo_url ? (
                            <OptimizedImg
                              src={business.logo_url}
                              alt={business.business_name}
                              className="h-full w-full object-contain object-center"
                              preset="logo"
                            />
                          ) : (
                            <span className="text-sm font-bold text-green-500">
                              {business.business_name.charAt(0)}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <Link href={listingHrefForVendor({ id: business.id, slug: business.slug })}>
                                <h3 className="text-xl font-bold text-white hover:text-green-500 transition">
                                  {business.business_name}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {business.social_equity_badge_visible && (
                                  <SocialEquityBadge className="text-xs" />
                                )}
                                {business.is_verified && (
                                  <Badge className="bg-blue-600/20 text-blue-500 border-blue-600/30">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                                {business.featured_until && new Date(business.featured_until) > new Date() && (
                                  <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30">
                                    <Award className="h-3 w-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                                <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30 capitalize">
                                  {business.plan_type || 'Basic'}
                                </Badge>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-pink-500">
                              <Heart className="h-5 w-5" />
                            </Button>
                          </div>

                          {business.description && (
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{business.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3 flex-wrap">
                            {business.average_rating && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="text-white font-semibold">{business.average_rating.toFixed(1)}</span>
                                  <span>({business.total_reviews || 0} reviews)</span>
                                </div>
                                <span>•</span>
                              </>
                            )}
                            {business.city && (
                              <>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{business.city}, {business.state}</span>
                                </div>
                              </>
                            )}
                            {distanceMi(business.id) != null && (
                              <>
                                <span>•</span>
                                <span className="text-green-400 font-medium">
                                  {distanceMi(business.id)!.toFixed(1)} mi away
                                </span>
                              </>
                            )}
                            {business.average_delivery_time && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{business.average_delivery_time} min avg</span>
                                </div>
                              </>
                            )}
                          </div>

                          {business.active_deals_count && business.active_deals_count > 0 && (
                            <div className="mb-3 p-2 bg-green-600/10 border border-green-600/20 rounded-lg">
                              <div className="flex items-center gap-2 text-green-400 text-sm">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-semibold">{business.active_deals_count} Active Deals</span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              asChild
                            >
                              <Link href={listingHrefForVendor({ id: business.id, slug: business.slug })}>
                                View {business.business_type === 'delivery' ? 'Products' : 'Menu'}
                              </Link>
                            </Button>
                            {business.phone && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-900/20 text-white hover:bg-green-500/10"
                                asChild
                              >
                                <a href={`tel:${business.phone}`}>
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </a>
                              </Button>
                            )}
                            {business.address && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-900/20 text-white hover:bg-green-500/10"
                                asChild
                              >
                                <a href={`https://maps.google.com/?q=${encodeURIComponent(`${business.address}, ${business.city}, ${business.state}`)}`} target="_blank" rel="noopener noreferrer">
                                  <Navigation className="h-4 w-4 mr-1" />
                                  Directions
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DispensariesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-gray-400">
          Loading directory…
        </div>
      }
    >
      <DispensariesPageInner />
    </Suspense>
  );
}
