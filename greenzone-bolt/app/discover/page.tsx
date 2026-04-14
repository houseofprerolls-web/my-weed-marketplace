"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchDiscoveryVendorsPayload, type DiscoveryVendor } from "@/lib/publicVendors";
import { Button } from "@/components/ui/button";
import { useVendorsSchema } from "@/contexts/VendorsSchemaContext";
import { extractZip5 } from "@/lib/zipUtils";
import {
  clearShopperGeo,
  persistShopperZip,
  readShopperGeo,
  readShopperZip5,
} from "@/lib/shopperLocation";
import { getMarketForSmokersClub } from "@/lib/marketFromZip";
import {
  fetchAdminDiscoverStripPinnedVendorIds,
  fetchApprovedVendorIdsForMarket,
  fetchVendorCoordsById,
  fetchVendorExtraLocationCoordsByVendorId,
  fetchVendorIdsServingZip5,
} from "@/lib/discoverMarketData";
import {
  type DiscoverSortContext,
  collectVendorMapGeoPoints,
  minHaversineKmFromShopper,
  minHaversineMilesFromShopper,
} from "@/lib/discoverSort";
import { pickWeightedClubPair } from "@/lib/discoverOrdering";
import { mergeDiscoverTreehouseTestPins } from "@/lib/smokersTestPins";
import { DiscoverStoreCard } from "@/components/discover/DiscoverStoreCard";
import { DiscoverCustomerTabs } from "@/components/discover/DiscoverCustomerTabs";
import {
  DiscoverCarouselRow,
  DiscoverSectionHeading,
} from "@/components/discover/DiscoverSectionHeading";
import { DiscoverQuickNav } from "@/components/discover/DiscoverQuickNav";
import { PlatformAdSlot } from "@/components/ads/PlatformAdSlot";
import { DiscoverStoreCardSkeleton } from "@/components/discover/DiscoverStoreCardSkeleton";
import { DISCOVER_STRIP_LIMIT, passesDiscoverStripGate } from "@/lib/discoverLaneFeatured";
import { publicDispensarySurfaceVisible } from "@/lib/publicDispensaryVisibility";
import { sortDiscoverTail } from "@/lib/discoverOrdering";
import { useAuth } from "@/contexts/AuthContext";
import { mapApproxCenterForShopperZip5 } from "@/lib/mapCoordinates";
import { fetchHappyHourVendorIdsForDiscover } from "@/lib/fetchDiscoverHappyHourVendors";
import type { DiscoverStripGateOptions } from "@/lib/discoverLaneFeatured";
import { vendorLiveLicenseApproved, vendorWithinPublicMapPinRadiusMiles } from "@/lib/vendorShopperArea";
import { Map as MapIcon, Tag } from "lucide-react";

type SortType = "distance" | "highest-rated" | "most-popular" | "newest";

const defaultSortCtx: DiscoverSortContext = {
  treehouseRank: new Map(),
  approvedForMarket: new Set(),
  shopperZip5: null,
  vendorIdsServingShopperZip: new Set(),
  shopperLat: null,
  shopperLng: null,
  withinPinRadiusVendorIds: new Set(),
};

function computeWithinPinRadiusVendorIds(
  merged: DiscoveryVendor[],
  rankLat: number | null,
  rankLng: number | null,
  zip5: string | null,
  vendorIdsServingShopperZip: Set<string>
): Set<string> {
  const out = new Set<string>();
  if (rankLat == null || rankLng == null) return out;
  const shopperZ = zip5 && zip5.length === 5 ? zip5 : null;
  const ctx = {
    shopperZip5: shopperZ,
    vendorIdsServingShopperZip,
    shopperMapLat: rankLat,
    shopperMapLng: rankLng,
  };
  for (const v of merged) {
    const f = {
      id: v.id,
      zip: v.zip ?? v.zip_code,
      smokers_club_eligible: v.smokers_club_eligible,
      is_live: v.is_live,
      license_status: v.license_status,
      billing_delinquent: v.billing_delinquent,
      geo_lat: v.geo_lat,
      geo_lng: v.geo_lng,
      map_geo_extra_points: v.map_geo_extra_points,
    };
    if (vendorLiveLicenseApproved(f) && vendorWithinPublicMapPinRadiusMiles(f, ctx)) {
      out.add(v.id);
    }
  }
  return out;
}


function isVendorOpen(vendorId: string): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 22;
}

function sortDiscoveryResults(
  filtered: DiscoveryVendor[],
  vendorsMode: boolean,
  sortCtx: DiscoverSortContext,
  sortBy: SortType
): DiscoveryVendor[] {
  const out = [...filtered];
  if (vendorsMode) {
    sortDiscoverTail(out, sortCtx, sortBy);
    return out;
  }
  switch (sortBy) {
    case "highest-rated":
      out.sort((a, b) => b.average_rating - a.average_rating);
      break;
    case "distance":
      out.sort((a, b) => {
        const geoOk = sortCtx.shopperLat != null && sortCtx.shopperLng != null;
        if (!geoOk) return a.business_name.localeCompare(b.business_name);
        const shopperLat = sortCtx.shopperLat!;
        const shopperLng = sortCtx.shopperLng!;
        const da =
          minHaversineKmFromShopper(
            shopperLat,
            shopperLng,
            collectVendorMapGeoPoints({ lat: a.geo_lat, lng: a.geo_lng }, a.map_geo_extra_points)
          ) ?? Number.POSITIVE_INFINITY;
        const db =
          minHaversineKmFromShopper(
            shopperLat,
            shopperLng,
            collectVendorMapGeoPoints({ lat: b.geo_lat, lng: b.geo_lng }, b.map_geo_extra_points)
          ) ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return a.business_name.localeCompare(b.business_name);
      });
      break;
    case "most-popular":
      out.sort((a, b) => b.total_reviews - a.total_reviews);
      break;
    case "newest":
      out.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
    default:
      out.sort((a, b) => {
        const aFeatured = a.featured_until && new Date(a.featured_until) > new Date() ? 1 : 0;
        const bFeatured = b.featured_until && new Date(b.featured_until) > new Date() ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        return b.average_rating - a.average_rating;
      });
  }
  return out;
}

function DiscoverPageContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const initialVendorsSchema = useVendorsSchema();
  const [vendorsMode, setVendorsMode] = useState(initialVendorsSchema);
  const locationParam = searchParams.get("location") || "";
  const zipFromUrl = useMemo(() => extractZip5(locationParam), [locationParam]);

  const [vendors, setVendors] = useState<DiscoveryVendor[]>([]);
  const [liveMenuSkuByVendor, setLiveMenuSkuByVendor] = useState<Record<string, number>>({});
  const [happyHourVendorIds, setHappyHourVendorIds] = useState<Set<string>>(() => new Set());
  const [sortCtx, setSortCtx] = useState<DiscoverSortContext>(defaultSortCtx);
  const [loading, setLoading] = useState(true);
  const [marketId, setMarketId] = useState<string | null>(null);
  /** `listing_markets.region_key` — used to scope strips (NY must not show nationwide club-eligible CA rows). */
  const [marketRegionKey, setMarketRegionKey] = useState<string | null>(null);
  const [zipLabel, setZipLabel] = useState<string | null>(null);
  const [adminStripPinnedVendorIds, setAdminStripPinnedVendorIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const discoverStripGateOpts: DiscoverStripGateOptions | undefined = useMemo(() => {
    const base: DiscoverStripGateOptions = {
      shopperZip5: sortCtx.shopperZip5,
      vendorIdsServingShopperZip: sortCtx.vendorIdsServingShopperZip,
      shopperMapLat: sortCtx.shopperLat,
      shopperMapLng: sortCtx.shopperLng,
      adminPinnedVendorIds: adminStripPinnedVendorIds,
    };
    if (marketRegionKey != null && marketRegionKey !== "ca") {
      base.requireMarketOpsOrTree = true;
    }
    return base;
  }, [
    marketRegionKey,
    sortCtx.shopperZip5,
    sortCtx.vendorIdsServingShopperZip,
    sortCtx.shopperLat,
    sortCtx.shopperLng,
    adminStripPinnedVendorIds,
  ]);

  useEffect(() => {
    const sync = () => setZipLabel(readShopperZip5());
    sync();
    window.addEventListener("datreehouse:zip", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("datreehouse:zip", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!vendorsMode || !zipFromUrl || typeof window === "undefined") return;
    clearShopperGeo();
    persistShopperZip(zipFromUrl);
  }, [vendorsMode, zipFromUrl]);

  const readZip5 = useCallback(() => readShopperZip5(), []);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const { vendors: base, vendors_schema } = await fetchDiscoveryVendorsPayload();
      setVendorsMode(vendors_schema);
      let merged = base;

      let menuCounts: Record<string, number> = {};
      if (vendors_schema && typeof window !== 'undefined') {
        try {
          const cr = await fetch('/api/discovery/live-menu-vendors', { cache: 'no-store' });
          if (cr.ok) {
            const j = (await cr.json()) as { counts?: Record<string, unknown> };
            const raw = j.counts;
            if (raw && typeof raw === 'object') {
              for (const [k, v] of Object.entries(raw)) {
                const n = Number(v);
                if (Number.isFinite(n) && n > 0) menuCounts[k] = n;
              }
            }
          }
        } catch {
          /* non-fatal */
        }
      }
      setLiveMenuSkuByVendor(menuCounts);

      // Use API flag here — not `vendorsMode` state (stale on first paint when env differs client vs server).
      if (vendors_schema) {
        const zip5 = readZip5() ?? extractZip5(profile?.zip_code ?? null);
        const market = zip5 ? await getMarketForSmokersClub(zip5) : null;
        setMarketId(market?.id ?? null);
        setMarketRegionKey(market?.region_key ?? null);
        const geoEarly = readShopperGeo();
        const approxEarly = zip5 ? mapApproxCenterForShopperZip5(zip5) : null;
        const rankLat = geoEarly?.lat ?? approxEarly?.lat ?? null;
        const rankLng = geoEarly?.lng ?? approxEarly?.lng ?? null;
        const ranksUrl = zip5 ? new URL("/api/smokers-club/operational-ranks", window.location.origin) : null;
        if (ranksUrl && zip5) {
          ranksUrl.searchParams.set("zip", zip5);
          if (rankLat != null && rankLng != null) {
            ranksUrl.searchParams.set("lat", String(rankLat));
            ranksUrl.searchParams.set("lng", String(rankLng));
          }
        }
        const [ranksPayload, approvedForMarket, coords, extraLocByVendor, vendorIdsServingShopperZip, adminPinned] =
          await Promise.all([
            ranksUrl
              ? fetch(ranksUrl.toString(), { cache: "no-store" })
                  .then((r) => (r.ok ? r.json() : { vendors_schema: false, ranks: {} }))
                  .catch(() => ({ vendors_schema: false, ranks: {} }))
              : Promise.resolve({ vendors_schema: false, ranks: {} }),
            market ? fetchApprovedVendorIdsForMarket(market.id) : Promise.resolve(new Set<string>()),
            fetchVendorCoordsById(),
            fetchVendorExtraLocationCoordsByVendorId(),
            zip5 ? fetchVendorIdsServingZip5(zip5) : Promise.resolve(new Set<string>()),
            market ? fetchAdminDiscoverStripPinnedVendorIds(market.id) : Promise.resolve(new Set<string>()),
          ]);
        setAdminStripPinnedVendorIds(adminPinned);

        const treehouseRankBase = new Map<string, number>();
        const rawRanks = (ranksPayload as { ranks?: Record<string, number> }).ranks;
        if (rawRanks && typeof rawRanks === "object") {
          for (const [id, v] of Object.entries(rawRanks)) {
            if (typeof v === "number") treehouseRankBase.set(id, v);
          }
        }

        merged = base.map((v) => {
          const c = coords.get(v.id);
          const extras = extraLocByVendor.get(v.id);
          const map_geo_extra_points =
            extras && extras.length > 0 ? extras.map((e) => ({ lat: e.lat, lng: e.lng })) : undefined;
          if (!c) {
            return map_geo_extra_points ? { ...v, map_geo_extra_points } : { ...v };
          }
          return {
            ...v,
            geo_lat: c.geo_lat,
            geo_lng: c.geo_lng,
            map_marker_image_url: c.map_marker_image_url ?? v.map_marker_image_url,
            logo_url: v.logo_url || c.logo_url || undefined,
            map_geo_extra_points,
          };
        });

        merged = merged.filter((v) =>
          publicDispensarySurfaceVisible(v.smokers_club_eligible === true, {
            distanceMiles:
              rankLat != null && rankLng != null
                ? minHaversineMilesFromShopper(
                    rankLat,
                    rankLng,
                    collectVendorMapGeoPoints({ lat: v.geo_lat, lng: v.geo_lng }, v.map_geo_extra_points)
                  )
                : undefined,
            inDeliveryZipCoverage: vendorIdsServingShopperZip.has(v.id),
          })
        );

        const treehouseRank = mergeDiscoverTreehouseTestPins(treehouseRankBase, merged, vendors_schema);

        setSortCtx((prev) => ({
          ...prev,
          treehouseRank,
          approvedForMarket,
          shopperZip5: zip5,
          vendorIdsServingShopperZip,
          shopperLat: rankLat,
          shopperLng: rankLng,
        }));
      } else {
        setMarketId(null);
        setMarketRegionKey(null);
        setAdminStripPinnedVendorIds(new Set());
        setSortCtx({ ...defaultSortCtx, withinPinRadiusVendorIds: new Set() });
      }

      setVendors(merged);
    } catch (error) {
      console.error("Error loading vendors:", error);
      setVendors([]);
      setLiveMenuSkuByVendor({});
    } finally {
      setLoading(false);
    }
  }, [readZip5, vendorsMode, profile?.zip_code]);

  const clubPlacementPins = useMemo(() => {
    if (!vendorsMode) return [] as DiscoveryVendor[];
    const pool = vendors.filter((v) => {
      const r = sortCtx.treehouseRank.get(v.id);
      return r != null && r >= 1 && r <= 4;
    });
    return pickWeightedClubPair(pool, sortCtx.treehouseRank);
  }, [vendorsMode, vendors, sortCtx.treehouseRank, sortCtx.shopperZip5]);

  const clubPinIdSet = useMemo(
    () => new Set(clubPlacementPins.map((v) => v.id)),
    [clubPlacementPins]
  );

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    if (!vendorsMode) return;
    setSortCtx((prev) => {
      const withinPinRadiusVendorIds = computeWithinPinRadiusVendorIds(
        vendors,
        prev.shopperLat,
        prev.shopperLng,
        prev.shopperZip5,
        prev.vendorIdsServingShopperZip
      );
      const pinIds = Array.from(withinPinRadiusVendorIds);
      const same =
        prev.withinPinRadiusVendorIds.size === withinPinRadiusVendorIds.size &&
        pinIds.every((id) => prev.withinPinRadiusVendorIds.has(id));
      if (same) return prev;
      return { ...prev, withinPinRadiusVendorIds };
    });
  }, [
    vendorsMode,
    vendors,
    sortCtx.shopperLat,
    sortCtx.shopperLng,
    sortCtx.shopperZip5,
    sortCtx.vendorIdsServingShopperZip,
  ]);

  useEffect(() => {
    // Happy hour badges only when the API finds a live time-window deal; clear while loading / on error / when none.
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
    const onZip = () => loadVendors();
    window.addEventListener("datreehouse:zip", onZip);
    window.addEventListener("storage", onZip);
    return () => {
      window.removeEventListener("datreehouse:zip", onZip);
      window.removeEventListener("storage", onZip);
    };
  }, [loadVendors]);

  useEffect(() => {
    const onGeo = () => {
      const g = readShopperGeo();
      setSortCtx((prev) => ({
        ...prev,
        shopperLat: g?.lat ?? null,
        shopperLng: g?.lng ?? null,
      }));
    };
    window.addEventListener("datreehouse:geo", onGeo);
    return () => window.removeEventListener("datreehouse:geo", onGeo);
  }, []);

  const distanceMi = useCallback(
    (v: DiscoveryVendor) => {
      if (sortCtx.shopperLat == null || sortCtx.shopperLng == null) return undefined;
      return minHaversineMilesFromShopper(
        sortCtx.shopperLat,
        sortCtx.shopperLng,
        collectVendorMapGeoPoints({ lat: v.geo_lat, lng: v.geo_lng }, v.map_geo_extra_points)
      );
    },
    [sortCtx.shopperLat, sortCtx.shopperLng]
  );

  const approvedForMarket = sortCtx.approvedForMarket;

  const smokersClubStores = useMemo(() => {
    if (!vendorsMode) return [];
    const pool = vendors.filter(
      (v) =>
        v.smokers_club_eligible === true &&
        passesDiscoverStripGate(v, approvedForMarket, sortCtx.treehouseRank, discoverStripGateOpts)
    );
    const sorted = [...pool].sort((a, b) => {
      const ra = sortCtx.treehouseRank.get(a.id) ?? 999;
      const rb = sortCtx.treehouseRank.get(b.id) ?? 999;
      if (ra !== rb) return ra - rb;
      if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
      return a.business_name.localeCompare(b.business_name);
    });
    return sorted.slice(0, DISCOVER_STRIP_LIMIT);
  }, [vendorsMode, vendors, approvedForMarket, sortCtx.treehouseRank, discoverStripGateOpts]);

  const nearestStorefronts = useMemo(() => {
    const withStore = vendors.filter((v) => {
      if (!v.offers_storefront) return false;
      if (!vendorsMode) return true;
      return passesDiscoverStripGate(v, approvedForMarket, sortCtx.treehouseRank, discoverStripGateOpts);
    });
    const latOk = sortCtx.shopperLat != null && sortCtx.shopperLng != null;
    if (!latOk) {
      return [...withStore]
        .sort((a, b) => a.business_name.localeCompare(b.business_name))
        .slice(0, DISCOVER_STRIP_LIMIT);
    }
    const scored = withStore
      .map((v) => {
        const d =
          minHaversineKmFromShopper(
            sortCtx.shopperLat!,
            sortCtx.shopperLng!,
            collectVendorMapGeoPoints({ lat: v.geo_lat, lng: v.geo_lng }, v.map_geo_extra_points)
          ) ?? Number.POSITIVE_INFINITY;
        return { v, d };
      })
      .sort((a, b) => {
        if (a.d !== b.d) return a.d - b.d;
        return a.v.business_name.localeCompare(b.v.business_name);
      });
    return scored.slice(0, DISCOVER_STRIP_LIMIT).map((x) => x.v);
  }, [
    vendors,
    vendorsMode,
    approvedForMarket,
    sortCtx.treehouseRank,
    sortCtx.shopperLat,
    sortCtx.shopperLng,
    discoverStripGateOpts,
  ]);

  const nearestLiveMenuStores = useMemo(() => {
    if (!vendorsMode) return [];
    const withSkus = vendors.filter((v) => {
      if ((liveMenuSkuByVendor[v.id] ?? 0) <= 0) return false;
      return passesDiscoverStripGate(v, approvedForMarket, sortCtx.treehouseRank, discoverStripGateOpts);
    });
    const latOk = sortCtx.shopperLat != null && sortCtx.shopperLng != null;
    if (!latOk) {
      return [...withSkus]
        .sort((a, b) => a.business_name.localeCompare(b.business_name))
        .slice(0, DISCOVER_STRIP_LIMIT);
    }
    const scored = withSkus
      .map((v) => {
        const d =
          minHaversineKmFromShopper(
            sortCtx.shopperLat!,
            sortCtx.shopperLng!,
            collectVendorMapGeoPoints({ lat: v.geo_lat, lng: v.geo_lng }, v.map_geo_extra_points)
          ) ?? Number.POSITIVE_INFINITY;
        return { v, d };
      })
      .sort((a, b) => {
        if (a.d !== b.d) return a.d - b.d;
        return a.v.business_name.localeCompare(b.v.business_name);
      });
    return scored.slice(0, DISCOVER_STRIP_LIMIT).map((x) => x.v);
  }, [
    vendorsMode,
    vendors,
    liveMenuSkuByVendor,
    approvedForMarket,
    sortCtx.treehouseRank,
    sortCtx.shopperLat,
    sortCtx.shopperLng,
    discoverStripGateOpts,
  ]);

  return (
    <div className="min-h-screen bg-background text-gray-100">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-emerald-900/20 bg-gradient-to-b from-emerald-950/[0.35] via-zinc-950/80 to-black">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(52,211,153,0.12) 0%, transparent 45%),
              radial-gradient(circle at 80% 10%, rgba(220,38,38,0.08) 0%, transparent 40%),
              linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 100%)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-size:24px_24px] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-14 sm:pt-14 lg:px-8 lg:pb-16 lg:pt-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-2xl">
              <DiscoverSectionHeading
                as="h1"
                eyebrow="Shop local"
                title="Discover stores"
                accent="forest"
                size="hero"
                withGlow
                className="mb-0"
              />
              {zipLabel ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-950/30 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-200/90">
                  <span className="text-emerald-500/80">Area</span>
                  <span className="text-white">{zipLabel}</span>
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row lg:w-auto lg:flex-col lg:items-stretch lg:gap-3">
              <Button
                asChild
                className="h-12 shrink-0 rounded-2xl bg-brand-red px-6 text-base font-semibold text-white shadow-lg shadow-brand-red/25 hover:bg-brand-red-deep"
              >
                <Link href="/dispensaries?sort=nearest">Browse all stores</Link>
              </Button>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-emerald-600/35 bg-emerald-950/20 text-emerald-100 hover:bg-emerald-950/40"
                >
                  <Link href="/map" className="inline-flex items-center justify-center gap-2">
                    <MapIcon className="h-4 w-4" aria-hidden />
                    Map
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-violet-600/35 bg-violet-950/20 text-violet-100 hover:bg-violet-950/40"
                >
                  <Link href="/deals" className="inline-flex items-center justify-center gap-2">
                    <Tag className="h-4 w-4" aria-hidden />
                    Deals
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <DiscoverQuickNav vendorsMode={vendorsMode} loading={loading} />

      <div className="mx-auto min-w-0 max-w-6xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Sponsored slots must not depend on vendors schema — otherwise banners never mount when vendorsMode is off */}
        <PlatformAdSlot
          placementKey="discover_top"
          stripLabel="Featured on Discover"
          compactStripChrome
          className="mb-2 max-md:scroll-mt-64 md:scroll-mt-44 sm:mb-4"
        />

        {vendorsMode && !loading ? (
          <div className="-mt-1 sm:mt-0">
            <DiscoverCustomerTabs
              vendors={vendors}
              vendorsMode={vendorsMode}
              marketId={marketId}
              approvedForMarket={sortCtx.approvedForMarket}
              treehouseRank={sortCtx.treehouseRank}
              clubPinIdSet={clubPinIdSet}
              distanceMi={distanceMi}
              isVendorOpen={isVendorOpen}
              stripGateOpts={discoverStripGateOpts}
              dealGateExtraVendorIds={sortCtx.withinPinRadiusVendorIds}
            />
          </div>
        ) : null}

        <PlatformAdSlot
          placementKey="discover_mid"
          stripLabel="Sponsored picks"
          compactStripChrome
          className="mt-2 mb-3 max-md:scroll-mt-64 md:scroll-mt-44 sm:mt-4 sm:mb-6"
        />

        {loading ? (
          <div className="mt-6 space-y-6 sm:mt-12 sm:space-y-10">
            <div className="min-w-0">
              <div className="mb-5 h-8 w-48 animate-pulse rounded-lg bg-gray-800/90" />
              <DiscoverCarouselRow>
                {Array.from({ length: 4 }).map((_, i) => (
                  <DiscoverStoreCardSkeleton key={i} featured />
                ))}
              </DiscoverCarouselRow>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-8 max-sm:mt-4 sm:mt-12 sm:space-y-14 md:space-y-16">
            {!vendorsMode ? (
              <div className="rounded-2xl border border-green-900/25 bg-gray-900/50 p-8 text-center text-zinc-200 shadow-sm">
                Enable{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-sm text-white">
                  NEXT_PUBLIC_USE_VENDORS_TABLE=1
                </code>
              </div>
            ) : null}

            {vendorsMode ? (
              <section
                className="max-md:scroll-mt-64 md:scroll-mt-44 min-w-0 overflow-visible rounded-3xl border border-amber-500/15 bg-gradient-to-br from-amber-950/25 via-zinc-950/50 to-black p-3 sm:p-8"
                aria-labelledby="discover-smokers-heading"
              >
                <DiscoverSectionHeading
                  id="discover-smokers-heading"
                  eyebrow="Smokers Club"
                  title="In your area"
                  accent="club"
                  size="section"
                />
                {smokersClubStores.length > 0 ? (
                  <DiscoverCarouselRow>
                    {smokersClubStores.map((vendor) => (
                      <DiscoverStoreCard
                        key={vendor.id}
                        vendor={vendor}
                        distanceMi={distanceMi(vendor)}
                        isOpen={isVendorOpen(vendor.id)}
                        featured
                      />
                    ))}
                  </DiscoverCarouselRow>
                ) : (
                  <p className="rounded-2xl border border-dashed border-amber-700/25 bg-amber-950/10 py-10 text-center text-sm text-zinc-400">
                    No Smokers Club slots for this ZIP yet. Check back as the market fills—or open the full directory.
                  </p>
                )}
              </section>
            ) : null}

            <section
              className="max-md:scroll-mt-64 md:scroll-mt-44 min-w-0 overflow-visible rounded-3xl border border-teal-500/15 bg-gradient-to-br from-teal-950/20 via-zinc-950/50 to-black p-3 sm:p-8"
              aria-labelledby="discover-nearest-heading"
            >
              <DiscoverSectionHeading
                id="discover-nearest-heading"
                eyebrow="Distance"
                title="Nearest storefronts"
                accent="mint"
                size="section"
              />
              {nearestStorefronts.length > 0 ? (
                <DiscoverCarouselRow>
                  {nearestStorefronts.map((vendor) => (
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
              ) : (
                <p className="rounded-2xl border border-dashed border-teal-800/25 bg-teal-950/10 py-10 text-center text-sm text-zinc-400">
                  {sortCtx.shopperLat != null && sortCtx.shopperLng != null
                    ? "No storefront listings with coordinates yet for sorting by distance."
                    : "Turn on location or set a ZIP in the header to sort storefronts by distance."}
                </p>
              )}
            </section>

            <section
              className="max-md:scroll-mt-64 md:scroll-mt-44 min-w-0 overflow-visible rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-zinc-950/50 to-black p-3 sm:p-8"
              aria-labelledby="discover-live-menu-heading"
            >
              <DiscoverSectionHeading
                id="discover-live-menu-heading"
                eyebrow="Order online"
                title="Live menus with items in stock"
                accent="forest"
                size="section"
              />
              {nearestLiveMenuStores.length > 0 ? (
                <DiscoverCarouselRow>
                  {nearestLiveMenuStores.map((vendor) => (
                    <DiscoverStoreCard
                      key={vendor.id}
                      vendor={vendor}
                      distanceMi={distanceMi(vendor)}
                      isOpen={isVendorOpen(vendor.id)}
                      featured
                      liveSkuCount={liveMenuSkuByVendor[vendor.id]}
                      happyHourActive={happyHourVendorIds.has(vendor.id)}
                    />
                  ))}
                </DiscoverCarouselRow>
              ) : (
                <p className="rounded-2xl border border-dashed border-emerald-800/25 bg-emerald-950/10 py-10 text-center text-sm text-zinc-400">
                  {vendorsMode
                    ? "No approved live shops with online ordering and in-stock SKUs match this view yet."
                    : "Enable the vendors table to see live menu picks."}
                </p>
              )}
            </section>

            <section
              className="max-md:scroll-mt-64 md:scroll-mt-44 relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 via-zinc-950/90 to-black p-6 sm:p-10 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_24px_80px_-32px_rgba(16,185,129,0.25)]"
              aria-labelledby="discover-all-stores-heading"
            >
              <div
                className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 max-w-xl">
                  <DiscoverSectionHeading
                    id="discover-all-stores-heading"
                    eyebrow="Full directory"
                    title="All stores"
                    accent="slate"
                    size="section"
                    className="mb-0"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-2xl bg-brand-red px-8 text-base font-semibold text-white shadow-lg shadow-brand-red/25 hover:bg-brand-red-deep"
                  >
                    <Link href="/dispensaries?sort=nearest">Open directory</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Link href="/map">Map view</Link>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoverSuspenseFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-emerald-900/20 bg-gradient-to-b from-emerald-950/40 to-black">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-48 rounded-full bg-zinc-800" />
            <div className="h-12 w-72 max-w-full rounded-xl bg-zinc-800" />
            <div className="h-4 w-full max-w-lg rounded bg-zinc-800/80" />
            <div className="flex flex-wrap gap-2 pt-4">
              <div className="h-12 w-40 rounded-2xl bg-zinc-800" />
              <div className="h-11 w-28 rounded-xl bg-zinc-800/80" />
              <div className="h-11 w-28 rounded-xl bg-zinc-800/80" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 animate-pulse sm:px-6 lg:px-8">
        <div className="h-10 w-full rounded-full bg-zinc-900" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-zinc-900" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSuspenseFallback />}>
      <DiscoverPageContent />
    </Suspense>
  );
}
