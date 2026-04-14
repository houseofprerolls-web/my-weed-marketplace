'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { readShopperZip5 } from '@/lib/shopperLocation';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import {
  fetchApprovedVendorIdsForMarket,
  fetchMarketLanePlacements,
} from '@/lib/discoverMarketData';
import { dealAppliesToShopperListingMarket } from '@/lib/dealRegions';
import { publicVendorDisplayName, resolveSocialEquityBadgeVisible } from '@/lib/vendorDisplayName';
import { readRecentlyViewedDispensaryIds } from '@/lib/recentlyViewedDispensaries';
import type { DiscoveryVendor } from '@/lib/publicVendors';
import {
  resolveDiscoverStripVendors,
  type DiscoverStripGateOptions,
} from '@/lib/discoverLaneFeatured';
import { fetchHappyHourVendorIdsForDiscover } from '@/lib/fetchDiscoverHappyHourVendors';
import { dealPromoImageUrl } from '@/lib/strainProductImage';
import { DiscoverStoreCard } from '@/components/discover/DiscoverStoreCard';
import { DiscoverDealCard, DiscoverDealCardSkeleton } from '@/components/discover/DiscoverDealCard';
import {
  DiscoverCarouselRow,
  DiscoverSectionHeading,
} from '@/components/discover/DiscoverSectionHeading';

const DEALS_STRIP_LIMIT = 12;

type DealRow = {
  id: string;
  title: string;
  image_url?: string | null;
  deal_options?: { hero_image_url?: string } | null;
  discount_percent: number;
  start_date: string;
  end_date: string;
  active_days?: number[] | null;
  daily_start_time?: string | null;
  daily_end_time?: string | null;
  region_keys: string[] | null;
  listing_market_slugs?: string[] | null;
  vendors:
    | {
        id: string;
        name: string;
        slug?: string | null;
        city: string | null;
        state: string | null;
        logo_url: string | null;
        social_equity_badge_visible?: boolean | null;
      }
    | {
        id: string;
        name: string;
        slug?: string | null;
        city: string | null;
        state: string | null;
        logo_url: string | null;
        social_equity_badge_visible?: boolean | null;
      }[]
    | null;
};

function dealIsActive(d: { start_date: string; end_date: string }) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const s = new Date(d.start_date);
  const e = new Date(d.end_date);
  s.setHours(0, 0, 0, 0);
  e.setHours(23, 59, 59, 999);
  return t >= s && t <= e;
}

function dealVendorRef(d: DealRow) {
  if (!d.vendors) return null;
  return Array.isArray(d.vendors) ? d.vendors[0] : d.vendors;
}

type Props = {
  vendors: DiscoveryVendor[];
  vendorsMode: boolean;
  marketId: string | null;
  approvedForMarket: Set<string>;
  treehouseRank: Map<string, number>;
  clubPinIdSet: Set<string>;
  distanceMi: (v: DiscoveryVendor) => number | undefined;
  isVendorOpen: (vendorId: string) => boolean;
  stripGateOpts?: DiscoverStripGateOptions;
  /** Union with `approvedForMarket` for Discover-tab deal visibility (15mi map-pin gate). */
  dealGateExtraVendorIds?: ReadonlySet<string>;
};

export function DiscoverCustomerTabs({
  vendors,
  vendorsMode,
  marketId,
  approvedForMarket,
  treehouseRank,
  clubPinIdSet,
  distanceMi,
  isVendorOpen,
  stripGateOpts,
  dealGateExtraVendorIds,
}: Props) {
  const { profile } = useAuth();
  const shouldGate = Boolean(vendorsMode && (!profile || profile.role === 'customer'));
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [deliveryPlacementIds, setDeliveryPlacementIds] = useState<string[]>([]);
  const [storefrontPlacementIds, setStorefrontPlacementIds] = useState<string[]>([]);
  const [happyHourVendorIds, setHappyHourVendorIds] = useState<Set<string>>(() => new Set());

  const refreshRecent = useCallback(() => {
    setRecentIds(readRecentlyViewedDispensaryIds());
  }, []);

  useEffect(() => {
    refreshRecent();
    const onStorage = () => refreshRecent();
    const onRecent = () => refreshRecent();
    window.addEventListener('storage', onStorage);
    window.addEventListener('datreehouse:recent-dispensary', onRecent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('datreehouse:recent-dispensary', onRecent);
    };
  }, [refreshRecent]);

  useEffect(() => {
    if (!vendorsMode || !marketId) {
      setDeliveryPlacementIds([]);
      setStorefrontPlacementIds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [d, s] = await Promise.all([
        fetchMarketLanePlacements(marketId, 'delivery'),
        fetchMarketLanePlacements(marketId, 'storefront'),
      ]);
      if (cancelled) return;
      setDeliveryPlacementIds(d);
      setStorefrontPlacementIds(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsMode, marketId]);

  useEffect(() => {
    let cancelled = false;
    setHappyHourVendorIds(new Set());
    if (!vendorsMode || vendors.length === 0) return;

    const ids = vendors.map((v) => v.id).filter(Boolean);
    if (ids.length === 0) return;

    void (async () => {
      const next = await fetchHappyHourVendorIdsForDiscover(ids);
      if (cancelled) return;
      setHappyHourVendorIds(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsMode, vendors]);

  useEffect(() => {
    if (!vendorsMode) {
      setDeals([]);
      setDealsLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setDealsLoading(true);
      const zip5 = readShopperZip5();
      let approved: Set<string> | null = null;
      let mSlug: string | null = null;
      let mRk: string | null = null;
      if (shouldGate) {
        if (zip5) {
          const market = await getMarketForSmokersClub(zip5);
          approved = market ? await fetchApprovedVendorIdsForMarket(market.id) : new Set();
          if (market) {
            mSlug = market.slug;
            mRk = market.region_key ?? null;
          }
        } else {
          approved = new Set();
        }
      }

      const { data, error } = await supabase
        .from('deals')
        .select(
          `
          id,
          title,
          image_url,
          deal_options,
          discount_percent,
          start_date,
          end_date,
          active_days,
          daily_start_time,
          daily_end_time,
          region_keys,
          listing_market_slugs,
          vendors!inner ( id, name, slug, city, state, logo_url, social_equity_badge_visible )
        `
        )
        .order('created_at', { ascending: false })
        .limit(40);

      if (cancelled) return;
      if (error) {
        console.warn('deals discover tab:', error.message);
        setDeals([]);
        setDealsLoading(false);
        return;
      }
      const rows = (data || []) as unknown as DealRow[];
      let filtered = rows.filter((d) => dealIsActive({ start_date: d.start_date, end_date: d.end_date }));
      if (shouldGate && approved) {
        const allowedForDeals = new Set(approved);
        Array.from(dealGateExtraVendorIds ?? []).forEach((id) => allowedForDeals.add(id));
        filtered = filtered.filter((d) => {
          const v = dealVendorRef(d);
          return v && allowedForDeals.has(v.id);
        });
      }
      filtered = filtered.filter((d) => {
        const v = dealVendorRef(d);
        if (shouldGate && mSlug) {
          return dealAppliesToShopperListingMarket(
            d.listing_market_slugs,
            d.region_keys,
            v?.state ?? null,
            mSlug,
            mRk
          );
        }
        return dealAppliesToShopperListingMarket(
          d.listing_market_slugs,
          d.region_keys,
          v?.state ?? null,
          null,
          null
        );
      });
      filtered.sort((a, b) => b.discount_percent - a.discount_percent);
      setDeals(filtered.slice(0, DEALS_STRIP_LIMIT));
      setDealsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsMode, shouldGate, dealGateExtraVendorIds]);

  const recentVendors = useMemo(() => {
    if (recentIds.length === 0) return [];
    const byId = new Map(vendors.map((v) => [v.id, v]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean) as DiscoveryVendor[];
  }, [recentIds, vendors]);

  const vendorsById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const deliveryPool = useMemo(() => vendors.filter((v) => v.offers_delivery), [vendors]);
  const storefrontPool = useMemo(
    () => vendors.filter((v) => v.offers_storefront),
    [vendors]
  );

  const featuredDelivery = useMemo(
    () =>
      resolveDiscoverStripVendors(
        deliveryPlacementIds,
        vendorsById,
        approvedForMarket,
        treehouseRank,
        (v) => v.offers_delivery,
        deliveryPool,
        clubPinIdSet,
        distanceMi,
        undefined,
        stripGateOpts
      ),
    [
      deliveryPlacementIds,
      vendorsById,
      approvedForMarket,
      treehouseRank,
      deliveryPool,
      clubPinIdSet,
      distanceMi,
      stripGateOpts,
    ]
  );

  const deliveryStripVendorIds = useMemo(
    () => new Set(featuredDelivery.map((v) => v.id)),
    [featuredDelivery]
  );

  const featuredStorefront = useMemo(
    () =>
      resolveDiscoverStripVendors(
        storefrontPlacementIds,
        vendorsById,
        approvedForMarket,
        treehouseRank,
        (v) => v.offers_storefront,
        storefrontPool,
        clubPinIdSet,
        distanceMi,
        undefined,
        stripGateOpts,
        deliveryStripVendorIds
      ),
    [
      storefrontPlacementIds,
      vendorsById,
      approvedForMarket,
      treehouseRank,
      storefrontPool,
      clubPinIdSet,
      distanceMi,
      stripGateOpts,
      deliveryStripVendorIds,
    ]
  );

  if (!vendorsMode) return null;

  return (
    <div
      id="discover-browse-strips"
      className="space-y-5 rounded-3xl border border-emerald-500/[0.12] bg-gradient-to-b from-zinc-950/90 via-zinc-950/40 to-black/30 p-3 shadow-[inset_0_1px_0_0_rgba(74,222,128,0.06)] sm:space-y-12 sm:p-8 md:space-y-14"
    >
      <section className="max-md:scroll-mt-64 md:scroll-mt-44 min-w-0 space-y-2 sm:space-y-3" aria-labelledby="discover-recent-heading">
        <DiscoverSectionHeading
          as="h3"
          id="discover-recent-heading"
          eyebrow="History"
          title="Recently viewed"
          accent="ocean"
          size="compact"
          withGlow={false}
          className="mb-0"
        />
        {recentVendors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-emerald-800/25 bg-emerald-950/15 py-10 text-center text-sm text-zinc-400">
            Shops you open will show up here for quick return visits.
          </p>
        ) : (
          <DiscoverCarouselRow>
            {recentVendors.map((vendor) => (
              <DiscoverStoreCard
                key={vendor.id}
                vendor={vendor}
                distanceMi={distanceMi(vendor)}
                isOpen={isVendorOpen(vendor.id)}
                featured
                happyHourActive={happyHourVendorIds.has(vendor.id)}
              />
            ))}
          </DiscoverCarouselRow>
        )}
      </section>

      <section className="max-md:scroll-mt-64 md:scroll-mt-44 min-w-0 space-y-3" aria-labelledby="discover-delivery-heading">
        <DiscoverSectionHeading
          as="h3"
          id="discover-delivery-heading"
          eyebrow="To your door"
          title="Featured delivery"
          accent="blaze"
          size="compact"
          withGlow={false}
          className="mb-0"
        />
        {featuredDelivery.length === 0 ? (
          <p className="rounded-xl border border-green-900/20 bg-gray-900/40 py-8 text-center text-sm text-zinc-300">
            <Link href="/dispensaries?sort=nearest" className="font-medium text-brand-lime-soft underline hover:text-white">
              All stores
            </Link>
          </p>
        ) : (
          <DiscoverCarouselRow>
            {featuredDelivery.map((vendor) => (
              <DiscoverStoreCard
                key={vendor.id}
                vendor={vendor}
                distanceMi={distanceMi(vendor)}
                isOpen={isVendorOpen(vendor.id)}
                featured
                happyHourActive={happyHourVendorIds.has(vendor.id)}
              />
            ))}
          </DiscoverCarouselRow>
        )}
      </section>

      <section className="max-md:scroll-mt-64 md:scroll-mt-44 min-w-0 space-y-2 sm:space-y-3" aria-labelledby="discover-storefront-heading">
        <DiscoverSectionHeading
          as="h3"
          id="discover-storefront-heading"
          eyebrow="Walk in"
          title="Featured storefronts"
          accent="mint"
          size="compact"
          withGlow={false}
          className="mb-0"
        />
        {featuredStorefront.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-teal-900/25 bg-teal-950/10 py-10 text-center text-sm text-zinc-400">
            No featured walk-ins yet.{' '}
            <Link href="/dispensaries?sort=nearest" className="font-medium text-brand-lime-soft underline hover:text-white">
              Browse all stores
            </Link>
          </p>
        ) : (
          <DiscoverCarouselRow>
            {featuredStorefront.map((vendor) => (
              <DiscoverStoreCard
                key={vendor.id}
                vendor={vendor}
                distanceMi={distanceMi(vendor)}
                isOpen={isVendorOpen(vendor.id)}
                featured
                happyHourActive={happyHourVendorIds.has(vendor.id)}
              />
            ))}
          </DiscoverCarouselRow>
        )}
      </section>

      <section className="min-w-0 space-y-2 sm:space-y-3" aria-labelledby="discover-deals-heading">
        <DiscoverSectionHeading
          as="h3"
          id="discover-deals-heading"
          eyebrow="Save"
          title="Featured deals"
          accent="iris"
          size="compact"
          withGlow={false}
          className="mb-0"
        />
        {dealsLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800 sm:h-28" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-violet-900/30 bg-violet-950/10 py-10 text-center text-sm text-zinc-400">
            Nothing live in your filters right now.{' '}
            <Link href="/deals" className="font-medium text-brand-lime-soft underline hover:text-white">
              See all deals
            </Link>
          </p>
        ) : (
          <DiscoverCarouselRow>
            {deals.map((d) => {
              const v = dealVendorRef(d);
              const vendorId = v?.id;
              const name = v ? publicVendorDisplayName(v.name) : 'Shop';
              const se = v
                ? resolveSocialEquityBadgeVisible(v.name, v.social_equity_badge_visible === true)
                : false;
              return (
                <DiscoverDealCard
                  key={d.id}
                  title={d.title}
                  discountPercent={d.discount_percent}
                  imageUrl={dealPromoImageUrl(d) ?? undefined}
                  vendorDisplayName={name}
                  vendorId={vendorId}
                  vendorSlug={v?.slug}
                  socialEquityBadge={se}
                  featured
                />
              );
            })}
          </DiscoverCarouselRow>
        )}
        {!dealsLoading && deals.length > 0 ? (
          <div className="flex justify-center pt-2">
            <Button asChild variant="outline" size="sm" className="border-green-800/50 text-brand-lime-soft hover:bg-green-950/50">
              <Link href="/deals">All deals</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
