"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tag, Clock, MapPin, Percent, Sparkles, Store, TrendingUp } from 'lucide-react';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { dealAppliesToShopperListingMarket } from '@/lib/dealRegions';
import { dealIsActiveNow } from '@/lib/dealSchedule';
import type { DealKind } from '@/lib/vendorMenuProductPricing';
import { useRole } from '@/hooks/useRole';
import { persistShopperZip, readShopperGeo, readShopperZip5 } from '@/lib/shopperLocation';
import { mapApproxCenterForShopperZip5 } from '@/lib/mapCoordinates';
import {
  fetchVendorCoordsById,
  fetchVendorExtraLocationCoordsByVendorId,
  fetchVendorIdsServingZip5,
} from '@/lib/discoverMarketData';
import { vendorLiveLicenseApproved, vendorWithinPublicMapPinRadiusMiles } from '@/lib/vendorShopperArea';
import { extractZip5 } from '@/lib/zipUtils';
import { getMarketForSmokersClub, type ListingMarket } from '@/lib/marketFromZip';
import { fetchApprovedVendorIdsForMarket } from '@/lib/discoverMarketData';
import { publicVendorDisplayName, resolveSocialEquityBadgeVisible } from '@/lib/vendorDisplayName';
import { SocialEquityBadge } from '@/components/vendor/SocialEquityBadge';
import { PlatformAdSlot } from '@/components/ads/PlatformAdSlot';
import { listingHrefForVendor } from '@/lib/listingPath';
import {
  buildMarketplaceFeaturedStrip,
  filterNewMarketplaceDeals,
  rankMarketplaceDeals,
} from '@/lib/marketplaceDealsRank';
import { DiscoverCarouselRow } from '@/components/discover/DiscoverSectionHeading';
import {
  isPublicLaunchVendorAllowlistActive,
  vendorSlugAllowedForPublicLaunch,
} from '@/lib/launchPublicSurface';

type DealOptions = {
  hero_image_url?: string;
  promo_code?: string;
  deal_kind?: DealKind;
  badge_label?: string;
  fixed_off_cents?: number;
  set_price_cents?: number;
  min_spend_cents?: number;
  custom_headline?: string;
  bogo?: boolean;
};

type MarketplaceDeal = {
  id: string;
  title: string;
  description: string | null;
  image_url?: string | null;
  discount_percent: number;
  products: string[];
  deal_options: DealOptions | null;
  region_keys: string[] | null;
  listing_market_slugs?: string[] | null;
  deal_click_count?: number | null;
  marketplace_featured_rank?: number | null;
  start_date: string;
  end_date: string;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  vendors:
    | {
        id: string;
        name: string;
        slug: string;
        city: string | null;
        state: string | null;
        logo_url: string | null;
        social_equity_badge_visible?: boolean | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        city: string | null;
        state: string | null;
        logo_url: string | null;
        social_equity_badge_visible?: boolean | null;
      }[]
    | null;
};

function dealCardBadge(deal: MarketplaceDeal): string {
  const kind = deal.deal_options?.deal_kind ?? (deal.deal_options?.bogo ? 'bogo' : 'percent_off');
  if (kind === 'fixed_amount_off') {
    const c = deal.deal_options?.fixed_off_cents;
    if (c != null && c > 0) return `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)} off`;
    return 'Deal';
  }
  if (kind === 'set_price') {
    const c = deal.deal_options?.set_price_cents;
    if (c != null && c > 0) return `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)} price`;
    return 'Deal';
  }
  if (kind === 'min_spend') {
    const c = deal.deal_options?.min_spend_cents;
    if (c != null && c > 0) return `Spend $${(c / 100).toFixed(0)}+`;
    return 'Min spend offer';
  }
  if (kind === 'custom') {
    const h = deal.deal_options?.custom_headline?.trim();
    return h || 'Special';
  }
  if (kind === 'bundle') return `${deal.discount_percent}% bundle`;
  if (kind === 'bogo') return deal.discount_percent > 0 ? `${deal.discount_percent}% · BOGO` : 'BOGO';
  return `${deal.discount_percent}% off`;
}

function dealEndsAtMs(d: MarketplaceDeal): number {
  if (d.ends_at) {
    const t = new Date(d.ends_at).getTime();
    if (Number.isFinite(t)) return t;
  }
  const e = new Date(d.end_date);
  e.setHours(23, 59, 59, 999);
  return e.getTime();
}

function trackDealClick(dealId: string) {
  void supabase.rpc('increment_deal_marketplace_click', { p_deal_id: dealId });
}

export default function DealsPage() {
  const [deals, setDeals] = useState<MarketplaceDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [zipDraft, setZipDraft] = useState('');
  const [zipError, setZipError] = useState<string | null>(null);
  const [mapReloadSeq, setMapReloadSeq] = useState(0);
  const { isAdmin, isVendor } = useRole();
  const vendorsSchema = useVendorsSchema();
  const shouldGateAreas = vendorsSchema && !isAdmin && !isVendor;
  const [approvedVendorIds, setApprovedVendorIds] = useState<Set<string> | null>(null);
  const [pinRadiusVendorIds, setPinRadiusVendorIds] = useState<Set<string>>(() => new Set());
  const [shopperZip5, setShopperZip5] = useState<string | null>(() => readShopperZip5());
  const [shopperMarket, setShopperMarket] = useState<ListingMarket | null>(null);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setShopperZip5(readShopperZip5());
    };
    window.addEventListener('datreehouse:zip', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('datreehouse:zip', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  useEffect(() => {
    setZipDraft(shopperZip5 ?? '');
  }, [shopperZip5]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!vendorsSchema) {
        if (!cancelled) {
          setDeals([]);
          setShopperMarket(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('deals')
        .select(
          `
          id,
          title,
          description,
          image_url,
          discount_percent,
          products,
          deal_options,
          region_keys,
          listing_market_slugs,
          deal_click_count,
          marketplace_featured_rank,
          start_date,
          end_date,
          starts_at,
          ends_at,
          active_days,
          daily_start_time,
          daily_end_time,
          created_at,
          vendors!inner ( id, name, slug, city, state, logo_url, social_equity_badge_visible )
        `
        )
        .order('created_at', { ascending: false });

      if (cancelled) return;
      let activeDeals: MarketplaceDeal[] = [];
      if (error) {
        console.error('Deals page:', error);
        setDeals([]);
      } else {
        const rows = (data || []) as unknown as MarketplaceDeal[];
        activeDeals = rows.filter((d) => dealIsActiveNow(d));
        setDeals(activeDeals);
      }

      let market: ListingMarket | null = null;
      if (shopperZip5) {
        market = await getMarketForSmokersClub(shopperZip5);
      }

      if (shouldGateAreas) {
        if (!shopperZip5 || !market) {
          setApprovedVendorIds(new Set());
          setPinRadiusVendorIds(new Set());
        } else {
          const approvedIds = await fetchApprovedVendorIdsForMarket(market.id);
          setApprovedVendorIds(approvedIds);

          const vendorIds = new Set<string>();
          for (const d of activeDeals) {
            const vs = d.vendors;
            const list = !vs ? [] : Array.isArray(vs) ? vs : [vs];
            for (const v of list) {
              vendorIds.add(v.id);
            }
          }
          const ids = Array.from(vendorIds);
          const pin = new Set<string>();
          if (ids.length > 0) {
            const geo = readShopperGeo();
            const approx = mapApproxCenterForShopperZip5(shopperZip5);
            const rankLat = geo?.lat ?? approx?.lat ?? null;
            const rankLng = geo?.lng ?? approx?.lng ?? null;
            if (rankLat != null && rankLng != null) {
              const [coords, extras, zipSrv] = await Promise.all([
                fetchVendorCoordsById(),
                fetchVendorExtraLocationCoordsByVendorId(),
                fetchVendorIdsServingZip5(shopperZip5),
              ]);
              const { data: vrows } = await supabase
                .from('vendors')
                .select('id, zip, is_live, license_status, billing_delinquent, smokers_club_eligible')
                .in('id', ids);
              const gateCtx = {
                shopperZip5: shopperZip5,
                vendorIdsServingShopperZip: zipSrv,
                shopperMapLat: rankLat,
                shopperMapLng: rankLng,
              };
              for (const row of (vrows || []) as {
                id: string;
                zip: string | null;
                is_live: boolean | null;
                license_status: string | null;
                billing_delinquent: boolean | null;
                smokers_club_eligible: boolean | null;
              }[]) {
                const c = coords.get(row.id);
                const ex = extras.get(row.id);
                const f = {
                  id: row.id,
                  zip: row.zip,
                  smokers_club_eligible: row.smokers_club_eligible,
                  is_live: row.is_live,
                  license_status: row.license_status,
                  billing_delinquent: row.billing_delinquent,
                  geo_lat: c?.geo_lat ?? null,
                  geo_lng: c?.geo_lng ?? null,
                  map_geo_extra_points:
                    ex && ex.length > 0 ? ex.map((e) => ({ lat: e.lat, lng: e.lng })) : undefined,
                };
                if (vendorLiveLicenseApproved(f) && vendorWithinPublicMapPinRadiusMiles(f, gateCtx)) {
                  pin.add(row.id);
                }
              }
            }
          }
          if (!cancelled) setPinRadiusVendorIds(pin);
        }
      } else {
        setApprovedVendorIds(null);
        setPinRadiusVendorIds(new Set());
      }
      if (!cancelled) setShopperMarket(market);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldGateAreas, shopperZip5, vendorsSchema]);

  const dealVendorIds = (d: MarketplaceDeal): string[] => {
    if (!d.vendors) return [];
    return Array.isArray(d.vendors) ? d.vendors.map((v) => v.id) : [d.vendors.id];
  };

  const dealVendorState = (d: MarketplaceDeal): string | null => {
    const v = Array.isArray(d.vendors) ? d.vendors[0] : d.vendors;
    return v?.state ?? null;
  };

  const nearMeFiltered = useMemo(() => {
    let out = deals;
    if (vendorsSchema && !shopperMarket) {
      out = [];
    } else if (shopperMarket) {
      out = out.filter((d) =>
        dealAppliesToShopperListingMarket(
          d.listing_market_slugs,
          d.region_keys,
          dealVendorState(d),
          shopperMarket.slug,
          shopperMarket.region_key ?? null
        )
      );
    }
    if (shouldGateAreas && approvedVendorIds) {
      const allowed = new Set(approvedVendorIds);
      pinRadiusVendorIds.forEach((id) => allowed.add(id));
      out = out.filter((d) => dealVendorIds(d).some((id) => allowed.has(id)));
    }
    if (isPublicLaunchVendorAllowlistActive()) {
      out = out.filter((d) => {
        const v = Array.isArray(d.vendors) ? d.vendors[0] : d.vendors;
        return v != null && vendorSlugAllowedForPublicLaunch(v.slug);
      });
    }
    return out;
  }, [deals, vendorsSchema, shopperMarket, shouldGateAreas, approvedVendorIds, pinRadiusVendorIds]);

  const rankedNearby = useMemo(() => rankMarketplaceDeals(nearMeFiltered), [nearMeFiltered]);
  const featuredStrip = useMemo(() => buildMarketplaceFeaturedStrip(rankedNearby, 12), [rankedNearby]);
  const newDealsStrip = useMemo(
    () => rankMarketplaceDeals(filterNewMarketplaceDeals(nearMeFiltered)),
    [nearMeFiltered]
  );

  function applyDealsZip() {
    const z = extractZip5(zipDraft);
    if (!z) {
      setZipError('Enter a valid 5-digit ZIP code.');
      return;
    }
    setZipError(null);
    persistShopperZip(z);
    setShopperZip5(z);
  }

  const getDaysLeft = useCallback((deal: MarketplaceDeal) => {
    const endMs = dealEndsAtMs(deal);
    const days = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }, []);

  const renderCarouselCard = (deal: MarketplaceDeal, opts?: { compact?: boolean }) => {
    const v = Array.isArray(deal.vendors) ? deal.vendors[0] : deal.vendors;
    if (!v) return null;
    const img = (deal.image_url || deal.deal_options?.hero_image_url || '').trim();
    const days = getDaysLeft(deal);
    const compact = opts?.compact ?? true;
    return (
      <div
        key={`${deal.id}-${opts?.compact ? 'c' : 'f'}`}
        className={`flex-shrink-0 snap-start ${compact ? 'w-[220px] sm:w-[260px]' : 'w-full max-w-sm'}`}
      >
        <Card className="group flex h-full flex-col overflow-hidden border-green-900/20 bg-gray-900/50 transition hover:border-green-600/50">
          <div className={`relative w-full bg-gray-950 ${compact ? 'aspect-[16/10]' : 'aspect-[16/10]'}`}>
            {img ? (
              <img
                src={img}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-800/30 to-gray-950">
                <Percent className="h-10 w-10 text-green-500/40" />
              </div>
            )}
            <Badge className="absolute left-2 top-2 bg-red-600 text-xs text-white">{dealCardBadge(deal)}</Badge>
            {deal.marketplace_featured_rank != null && (
              <Badge className="absolute right-2 top-2 border-amber-500/50 bg-amber-950/90 text-[10px] text-amber-200">
                Featured
              </Badge>
            )}
          </div>
          <div className="flex flex-1 flex-col p-3">
            <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white group-hover:text-green-400">
              {deal.title}
            </h3>
            <p className="mb-2 line-clamp-1 text-xs text-zinc-400">{publicVendorDisplayName(v.name)}</p>
            <div className="mb-2 flex flex-wrap gap-1">
              <Badge variant="outline" className="border-gray-600 text-[10px] text-gray-400">
                {days}d
              </Badge>
            </div>
            <div className="mt-auto">
              <Button asChild className="h-8 w-full bg-green-600 text-xs hover:bg-green-700">
                <Link
                  href={listingHrefForVendor({ id: v.id, slug: v.slug })}
                  onClick={() => trackDealClick(deal.id)}
                >
                  Shop
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-green-400">
            <Percent className="h-8 w-8" />
          </div>
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">Deals Near You</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 pb-6">
        <PlatformAdSlot placementKey="deals" stripLabel="Featured deals & shops" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {!vendorsSchema ? (
          <Card className="border-green-900/20 bg-gray-900/50 p-10 text-center text-zinc-200">
            Enable the vendors schema to browse deals here.
          </Card>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <p className="text-sm text-zinc-200">
                  <span className="font-semibold text-white">{rankedNearby.length}</span>
                  <span className="text-zinc-400"> Deals Near You</span>
                  {shopperZip5 ? (
                    <span className="text-zinc-500"> · ZIP {shopperZip5}</span>
                  ) : null}
                  <span className="text-zinc-500"> · {deals.length} live</span>
                </p>
                <Dialog open={allOpen} onOpenChange={setAllOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-green-700/50 text-green-200 hover:bg-green-950/50">
                      All deals nearby
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto border-green-900/30 bg-gray-950 text-white sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>All deals nearby</DialogTitle>
                    </DialogHeader>
                    <ul className="space-y-3 pt-2">
                      {rankedNearby.map((deal) => {
                        const v = Array.isArray(deal.vendors) ? deal.vendors[0] : deal.vendors;
                        if (!v) return null;
                        return (
                          <li key={deal.id}>
                            <Link
                              href={listingHrefForVendor({ id: v.id, slug: v.slug })}
                              className="flex items-start justify-between gap-3 rounded-lg border border-green-900/20 bg-gray-900/40 p-3 hover:border-green-600/40"
                              onClick={() => {
                                trackDealClick(deal.id);
                                setAllOpen(false);
                              }}
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-white">{deal.title}</p>
                                <p className="text-xs text-zinc-400">{publicVendorDisplayName(v.name)}</p>
                              </div>
                              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                                {deal.marketplace_featured_rank != null && (
                                  <Badge className="bg-amber-700/30 text-[10px] text-amber-200">Featured</Badge>
                                )}
                                <span className="text-[10px] text-zinc-500">{deal.deal_click_count ?? 0} clicks</span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
                <Label htmlFor="deals-zip" className="text-xs text-zinc-500">
                  Your ZIP code
                </Label>
                <div className="flex flex-wrap items-stretch gap-2">
                  <Input
                    id="deals-zip"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={10}
                    placeholder="90210"
                    value={zipDraft}
                    onChange={(e) => {
                      setZipDraft(e.target.value);
                      setZipError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyDealsZip();
                      }
                    }}
                    className="max-w-[140px] border-green-900/30 bg-gray-900 text-white"
                  />
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={applyDealsZip}
                  >
                    Apply
                  </Button>
                </div>
                {zipError ? <p className="text-xs text-amber-300/90">{zipError}</p> : null}
              </div>
            </div>

            {!loading && rankedNearby.length > 0 && (
              <div className="mb-12 space-y-10">
                <section>
                  <div className="mb-3 flex items-center gap-2 text-white">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <h2 className="text-lg font-semibold">Featured & popular nearby</h2>
                  </div>
                  <DiscoverCarouselRow>
                    <div
                      className="flex min-w-0 gap-4 pb-1"
                      data-discover-carousel-track
                    >
                      {featuredStrip.map((d) => renderCarouselCard(d))}
                    </div>
                  </DiscoverCarouselRow>
                </section>

                {newDealsStrip.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center gap-2 text-white">
                      <Sparkles className="h-5 w-5 text-violet-400" />
                      <h2 className="text-lg font-semibold">New deals</h2>
                    </div>
                    <DiscoverCarouselRow>
                      <div className="flex min-w-0 gap-4 pb-1" data-discover-carousel-track>
                        {newDealsStrip.map((d) => renderCarouselCard(d))}
                      </div>
                    </DiscoverCarouselRow>
                  </section>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="h-80 animate-pulse border-green-900/20 bg-gray-900/50" />
                ))}
              </div>
            ) : rankedNearby.length === 0 ? (
              <Card className="border-green-900/20 bg-gray-900/50 p-12 text-center">
                <Tag className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h2 className="mb-6 text-2xl font-bold text-white">No deals in this ZIP area</h2>
                <Link href="/dispensaries">
                  <Button className="bg-green-600 hover:bg-green-700">Browse dispensaries</Button>
                </Link>
              </Card>
            ) : (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-white">Trending deals nearby</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rankedNearby.map((deal) => {
                    const v = Array.isArray(deal.vendors) ? deal.vendors[0] : deal.vendors;
                    if (!v) return null;
                    const img = (deal.image_url || deal.deal_options?.hero_image_url || '').trim();
                    const days = getDaysLeft(deal);
                    return (
                      <Card
                        key={deal.id}
                        className="group flex flex-col overflow-hidden border-green-900/20 bg-gray-900/50 transition hover:border-green-600/50"
                      >
                        <div className="relative aspect-[16/10] w-full bg-gray-950">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-800/30 to-gray-950">
                              <Percent className="h-14 w-14 text-green-500/40" />
                            </div>
                          )}
                          <Badge className="absolute left-3 top-3 bg-red-600 text-white">{dealCardBadge(deal)}</Badge>
                          {deal.marketplace_featured_rank != null && (
                            <Badge className="absolute right-3 top-3 border-amber-500/50 bg-amber-950/90 text-amber-200">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="mb-1 line-clamp-2 text-lg font-semibold text-white group-hover:text-green-400">
                            {deal.title}
                          </h3>
                          {deal.description && (
                            <p className="mb-3 line-clamp-2 text-sm text-zinc-300">{deal.description}</p>
                          )}
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <Store className="h-3.5 w-3.5 shrink-0" />
                              <span>{publicVendorDisplayName(v.name)}</span>
                              {resolveSocialEquityBadgeVisible(v.name, v.social_equity_badge_visible === true) && (
                                <SocialEquityBadge className="text-[10px]" />
                              )}
                            </span>
                            {(v.city || v.state) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {[v.city, v.state].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                              <Clock className="mr-1 h-3 w-3" />
                              {days}d left
                            </Badge>
                            {(deal.deal_click_count ?? 0) > 0 && (
                              <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                                {deal.deal_click_count} clicks
                              </Badge>
                            )}
                          </div>
                          {deal.deal_options?.promo_code && (
                            <p className="mb-3 font-mono text-sm text-green-400">Code: {deal.deal_options.promo_code}</p>
                          )}
                          <div className="mt-auto pt-2">
                            <Link href={listingHrefForVendor({ id: v.id, slug: v.slug })} onClick={() => trackDealClick(deal.id)}>
                              <Button className="w-full bg-green-600 hover:bg-green-700">Shop this store</Button>
                            </Link>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

