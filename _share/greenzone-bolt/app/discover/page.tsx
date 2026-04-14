"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchDiscoveryVendors, type DiscoveryVendor } from "@/lib/publicVendors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, Map as MapIcon, List, SlidersHorizontal } from "lucide-react";
import { isVendorsSchema } from "@/lib/vendorSchema";
import { extractZip5 } from "@/lib/zipUtils";
import {
  clearShopperGeo,
  persistShopperZip,
  readShopperGeo,
  readShopperZip5,
} from "@/lib/shopperLocation";
import { getMarketForSmokersClub } from "@/lib/marketFromZip";
import {
  fetchTreehouseRanksForMarket,
  fetchApprovedVendorIdsForMarket,
  fetchVendorCoordsById,
} from "@/lib/discoverMarketData";
import { type DiscoverSortContext, haversineKm } from "@/lib/discoverSort";
import { pickWeightedClubPair } from "@/lib/discoverOrdering";
import { mergeDiscoverTreehouseTestPins } from "@/lib/smokersTestPins";
import { DiscoverVendorMap } from "@/components/discover/DiscoverVendorMap";
import { DiscoverStoreCard } from "@/components/discover/DiscoverStoreCard";
import {
  DiscoverStoreCardSkeleton,
  DiscoverPageSkeletonGrid,
} from "@/components/discover/DiscoverStoreCardSkeleton";
import { pickFeaturedStores } from "@/lib/discoverFeatured";
import { sortDiscoverTail } from "@/lib/discoverOrdering";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type SortType = "distance" | "highest-rated" | "most-popular" | "newest";
type ViewMode = "list" | "map";

type ChipId = "open" | "rated" | "deals" | "freeDel" | "liveMenu" | "storefront" | "delivery";

const CHIP_META: { id: ChipId; label: string }[] = [
  { id: "open", label: "Open now" },
  { id: "rated", label: "4+ stars" },
  { id: "freeDel", label: "Free delivery" },
  { id: "deals", label: "Deals" },
  { id: "liveMenu", label: "Live menu" },
  { id: "storefront", label: "Storefront" },
  { id: "delivery", label: "Delivery" },
];

const defaultSortCtx: DiscoverSortContext = {
  treehouseRank: new Map(),
  approvedForMarket: new Set(),
  shopperZip5: null,
  shopperLat: null,
  shopperLng: null,
};

const FEATURED_LIMIT = 8;
const PAGE_SIZE = 16;

function isVendorOpen(vendorId: string): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 22;
}

function chipPasses(v: DiscoveryVendor, id: ChipId): boolean {
  switch (id) {
    case "open":
      return isVendorOpen(v.id);
    case "rated":
      return v.average_rating >= 4;
    case "deals":
      return v.active_deals_count > 0;
    case "freeDel":
      return v.delivery_fee === 0;
    case "liveMenu":
      return v.online_menu_enabled === true;
    case "storefront":
      return v.offers_storefront;
    case "delivery":
      return v.offers_delivery;
    default:
      return true;
  }
}

function filterBySearchQuery(list: DiscoveryVendor[], searchQuery: string): DiscoveryVendor[] {
  const raw = searchQuery.trim();
  if (!raw) return list;

  const digitOnly = raw.replace(/\D/g, "");
  /** Mostly digits → treat as ZIP / partial ZIP filter */
  const zipish = /^\d[\d\s-]*$/.test(raw) && digitOnly.length >= 1;

  if (zipish) {
    const prefix = digitOnly.slice(0, 5);
    return list.filter((v) => {
      const vz = (v.zip || "").replace(/\D/g, "");
      return vz.startsWith(prefix);
    });
  }

  const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);

  return list.filter((v) => {
    const blob = [v.business_name, v.city, v.state, v.address, v.slug]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const zipNorm = (v.zip || "").replace(/\D/g, "");

    return tokens.every((t) => {
      if (/^\d+$/.test(t)) return zipNorm.includes(t) || blob.includes(t);
      return blob.includes(t);
    });
  });
}

function filterByChips(list: DiscoveryVendor[], activeChips: Set<ChipId>): DiscoveryVendor[] {
  let filtered = [...list];
  activeChips.forEach((id) => {
    filtered = filtered.filter((v) => chipPasses(v, id));
  });
  return filtered;
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
      out.sort(() => Math.random() - 0.5);
      break;
    case "most-popular":
      out.sort((a, b) => b.total_reviews - a.total_reviews);
      break;
    case "newest":
      out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

/** @param applyTextSearch when false and search empty, map keeps all pins that match chips only. When search has text, map list also filters by name/location. */
function buildDiscoveryList(
  vendors: DiscoveryVendor[],
  searchQuery: string,
  activeChips: Set<ChipId>,
  applyTextSearch: boolean,
  vendorsMode: boolean,
  sortCtx: DiscoverSortContext,
  sortBy: SortType
): DiscoveryVendor[] {
  let list = [...vendors];
  const q = searchQuery.trim();
  if (applyTextSearch || q.length > 0) list = filterBySearchQuery(list, searchQuery);
  list = filterByChips(list, activeChips);
  return sortDiscoveryResults(list, vendorsMode, sortCtx, sortBy);
}

function DiscoverPageContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const vendorsMode = isVendorsSchema();
  const shouldGateAreas = Boolean(vendorsMode && (!profile || profile.role === "customer"));
  const locationParam = searchParams.get("location") || "";
  const zipFromUrl = useMemo(() => extractZip5(locationParam), [locationParam]);

  const [vendors, setVendors] = useState<DiscoveryVendor[]>([]);
  const [sortCtx, setSortCtx] = useState<DiscoverSortContext>(defaultSortCtx);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChips, setActiveChips] = useState<Set<ChipId>>(new Set());
  const [sortBy, setSortBy] = useState<SortType>("distance");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterSheetSide, setFilterSheetSide] = useState<"bottom" | "right">("right");

  useEffect(() => {
    if (!vendorsMode || !zipFromUrl || typeof window === "undefined") return;
    clearShopperGeo();
    persistShopperZip(zipFromUrl);
  }, [vendorsMode, zipFromUrl]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setFilterSheetSide(mq.matches ? "bottom" : "right");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const readZip5 = useCallback(() => readShopperZip5(), []);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const base = await fetchDiscoveryVendors();
      let merged = base;

      if (vendorsMode) {
        const zip5 = readZip5() ?? extractZip5(profile?.zip_code ?? null);
        const market = zip5 ? await getMarketForSmokersClub(zip5) : null;
        const [treehouseRankBase, approvedForMarket, coords] = await Promise.all([
          market ? fetchTreehouseRanksForMarket(market.id) : Promise.resolve(new Map<string, number>()),
          market ? fetchApprovedVendorIdsForMarket(market.id) : Promise.resolve(new Set<string>()),
          fetchVendorCoordsById(),
        ]);

        merged = base.map((v) => {
          const c = coords.get(v.id);
          if (!c) return { ...v };
          return {
            ...v,
            geo_lat: c.geo_lat,
            geo_lng: c.geo_lng,
            map_marker_image_url: c.map_marker_image_url ?? v.map_marker_image_url,
            logo_url: v.logo_url || c.logo_url || undefined,
          };
        });

        const treehouseRank = mergeDiscoverTreehouseTestPins(treehouseRankBase, merged);

        const geo = readShopperGeo();
        setSortCtx((prev) => ({
          ...prev,
          treehouseRank,
          approvedForMarket,
          shopperZip5: zip5,
          shopperLat: geo?.lat ?? null,
          shopperLng: geo?.lng ?? null,
        }));
      } else {
        setSortCtx(defaultSortCtx);
      }

      setVendors(merged);
    } catch (error) {
      console.error("Error loading vendors:", error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [readZip5, vendorsMode, profile?.zip_code]);

  const clubPlacementPins = useMemo(() => {
    if (!vendorsMode) return [] as DiscoveryVendor[];
    const pool = vendors.filter((v) => {
      const r = sortCtx.treehouseRank.get(v.id);
      return r != null && r >= 1 && r <= 10;
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

  const vendorsForMap = useMemo(
    () =>
      buildDiscoveryList(
        vendorsMode && shouldGateAreas
          ? vendors.filter((v) => sortCtx.approvedForMarket.has(v.id))
          : vendors,
        searchQuery,
        activeChips,
        false,
        vendorsMode,
        sortCtx,
        sortBy
      ),
    [vendors, searchQuery, activeChips, vendorsMode, shouldGateAreas, sortCtx, sortBy, clubPinIdSet]
  );

  const filteredVendors = useMemo(
    () =>
      buildDiscoveryList(vendors, searchQuery, activeChips, true, vendorsMode, sortCtx, sortBy),
    [vendors, searchQuery, activeChips, vendorsMode, sortCtx, sortBy]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeChips, sortBy, vendors.length]);

  const distanceMi = useCallback(
    (v: DiscoveryVendor) => {
      if (
        sortCtx.shopperLat == null ||
        sortCtx.shopperLng == null ||
        v.geo_lat == null ||
        v.geo_lng == null
      )
        return undefined;
      return haversineKm(sortCtx.shopperLat, sortCtx.shopperLng, v.geo_lat, v.geo_lng) * 0.621371;
    },
    [sortCtx.shopperLat, sortCtx.shopperLng]
  );

  const featuredStores = useMemo(
    () => {
      const featuredSource = shouldGateAreas
        ? filteredVendors.filter((v) => sortCtx.approvedForMarket.has(v.id) || clubPinIdSet.has(v.id))
        : filteredVendors;
      return pickFeaturedStores(featuredSource, clubPinIdSet, FEATURED_LIMIT);
    },
    [filteredVendors, clubPinIdSet, shouldGateAreas, sortCtx]
  );

  const featuredIds = useMemo(() => new Set(featuredStores.map((v) => v.id)), [featuredStores]);

  const allStoresList = useMemo(
    () =>
      filteredVendors.filter(
        (v) =>
          !featuredIds.has(v.id) &&
          (!vendorsMode || !shouldGateAreas || sortCtx.approvedForMarket.has(v.id))
      ),
    [filteredVendors, featuredIds, vendorsMode, shouldGateAreas, sortCtx]
  );

  const paginatedAll = allStoresList.slice(0, page * PAGE_SIZE);
  const hasMore = allStoresList.length > paginatedAll.length;

  const toggleChip = (id: ChipId) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAllFilters = () => {
    setActiveChips(new Set());
    setSearchQuery("");
    setFilterSheetOpen(false);
  };

  const FilterChipButton = ({ id, label }: { id: ChipId; label: string }) => {
    const on = activeChips.has(id);
    return (
      <button
        type="button"
        onClick={() => toggleChip(id)}
        className={cn(
          "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          on
            ? "border-brand-red/50 bg-brand-red/20 text-white shadow-sm"
            : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-600 hover:bg-gray-900"
        )}
      >
        {label}
      </button>
    );
  };

  const ChipRow = ({ className }: { className?: string }) => (
    <div
      className={cn(
        "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-1 sm:flex-wrap sm:overflow-visible",
        className
      )}
    >
      {CHIP_META.map(({ id, label }) => (
        <FilterChipButton key={id} id={id} label={label} />
      ))}
    </div>
  );

  const SortSelect = () => (
    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
      <SelectTrigger className="h-10 w-full border-green-900/35 bg-gray-900 text-white sm:w-[220px]">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent className="border-green-900/30 bg-gray-950 text-white">
        <SelectItem value="distance">Nearest</SelectItem>
        <SelectItem value="highest-rated">Highest rated</SelectItem>
        <SelectItem value="most-popular">Most popular</SelectItem>
        <SelectItem value="newest">Newest</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Hero + search */}
      <header className="border-b border-brand-red/20 bg-gradient-to-b from-green-950/35 to-black">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Discover stores</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-gray-400">
            Search stores or browse filters. Tap a store to open its menu.             Set your ZIP or use <span className="text-gray-300">Near me</span> in the bar under the main menu for nearby
            ordering.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                aria-hidden
              />
              <Input
                placeholder="Search name, city, address, or ZIP — results filter as you type"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 rounded-2xl border-green-900/40 bg-gray-900/80 pl-12 pr-4 text-base text-white placeholder:text-gray-500 shadow-inner transition-colors focus-visible:border-green-600/50 focus-visible:ring-green-600/30"
              />
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-14 rounded-2xl px-4",
                  viewMode === "list"
                    ? "bg-brand-red text-white hover:bg-brand-red-deep"
                    : "border-gray-700 bg-transparent text-gray-200 hover:bg-gray-900"
                )}
              >
                <List className="mr-2 h-4 w-4" />
                List
              </Button>
              <Button
                type="button"
                variant={viewMode === "map" ? "default" : "outline"}
                onClick={() => setViewMode("map")}
                className={cn(
                  "h-14 rounded-2xl px-4",
                  viewMode === "map"
                    ? "bg-brand-red text-white hover:bg-brand-red-deep"
                    : "border-gray-700 bg-transparent text-gray-200 hover:bg-gray-900"
                )}
              >
                <MapIcon className="mr-2 h-4 w-4" />
                Map
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* Category chips — desktop */}
        <div className="hidden md:block">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Quick filters</p>
          <ChipRow />
        </div>

        {/* Toolbar: count, sort, mobile filters */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mt-10">
          <p className="text-sm text-gray-400">
            {loading ? "Loading…" : `${filteredVendors.length} stores`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="hidden sm:block">
              <SortSelect />
            </div>
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full rounded-xl border-gray-700 bg-transparent text-gray-200 hover:bg-gray-900 sm:w-auto"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters & sort
                </Button>
              </SheetTrigger>
              <SheetContent
                key={filterSheetSide}
                side={filterSheetSide}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className={cn(
                  "w-full border-gray-800 bg-gray-950 text-gray-100 sm:max-w-md",
                  filterSheetSide === "bottom" && "h-[85vh] rounded-t-2xl"
                )}
              >
                <SheetHeader>
                  <SheetTitle className="text-left text-white">Filters & sort</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6 overflow-y-auto pb-8">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Sort by</p>
                    <SortSelect />
                  </div>
                  <div>
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Quick filters</p>
                    <div className="flex flex-wrap gap-2">
                      {CHIP_META.map(({ id, label }) => (
                        <FilterChipButton key={id} id={id} label={label} />
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full text-gray-400 hover:bg-gray-900" onClick={clearAllFilters}>
                    Clear all
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile chips below toolbar */}
        <div className="mt-4 md:hidden">
          <ChipRow />
        </div>

        {vendorsMode && (
          <div className="mt-8">
            <DiscoverVendorMap
              vendors={vendorsForMap}
              userLat={sortCtx.shopperLat}
              userLng={sortCtx.shopperLng}
              dense={viewMode === "list"}
            />
            <p className="mt-3 text-center text-xs text-gray-500">
              Map follows chip filters; when you type in search, pins match too. Red pins are delivery-only; green are
              storefronts.
            </p>
          </div>
        )}

        {loading ? (
          <div className="mt-12 space-y-10">
            <div className="min-w-0">
              <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-800" />
              <div className="-mx-4 flex flex-nowrap gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-pl-4 scroll-pr-12 pb-2 pl-4 pr-12 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:-mx-6 sm:scroll-pr-16 sm:pl-6 sm:pr-16 lg:-mx-8 lg:pl-8 lg:pr-20 [&::-webkit-scrollbar]:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <DiscoverStoreCardSkeleton key={i} featured />
                ))}
                <div className="min-w-8 shrink-0 sm:min-w-12" aria-hidden />
              </div>
            </div>
            <div>
              <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-800" />
              <DiscoverPageSkeletonGrid count={8} />
            </div>
          </div>
        ) : viewMode === "list" ? (
          <>
            {filteredVendors.length === 0 ? (
              <div className="mt-12 rounded-2xl border border-green-900/25 bg-gray-900/50 p-12 text-center shadow-sm">
                <p className="text-gray-400">No stores match your filters.</p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-xl border-gray-600 text-gray-200 hover:bg-gray-800"
                  onClick={clearAllFilters}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="mt-12 space-y-16">
                {featuredStores.length > 0 && (
                  <section className="overflow-visible">
                    <div className="mb-6 flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold tracking-tight text-white">Featured stores</h2>
                        <p className="mt-1 text-sm text-gray-500">Hand-picked and top picks near you</p>
                      </div>
                    </div>
                    <div className="-mx-4 flex flex-nowrap gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-pl-4 scroll-pr-12 pb-3 pl-4 pr-12 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:-mx-6 sm:scroll-pr-16 sm:pl-6 sm:pr-16 lg:-mx-8 lg:pl-8 lg:pr-20 [&::-webkit-scrollbar]:hidden">
                      {featuredStores.map((vendor) => (
                        <DiscoverStoreCard
                          key={vendor.id}
                          vendor={vendor}
                          distanceMi={distanceMi(vendor)}
                          isOpen={isVendorOpen(vendor.id)}
                          featured
                        />
                      ))}
                      <div className="min-w-8 shrink-0 sm:min-w-12" aria-hidden />
                    </div>
                  </section>
                )}

                {allStoresList.length > 0 && (
                  <section className="min-w-0">
                    <h2 className="mb-6 text-xl font-semibold tracking-tight text-white">All stores</h2>
                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {paginatedAll.map((vendor) => (
                        <DiscoverStoreCard
                          key={vendor.id}
                          vendor={vendor}
                          distanceMi={distanceMi(vendor)}
                          isOpen={isVendorOpen(vendor.id)}
                        />
                      ))}
                    </div>
                    {hasMore && (
                      <div className="mt-10 flex justify-center">
                        <Button
                          variant="outline"
                          size="lg"
                          className="min-w-[200px] rounded-xl border-gray-600 text-gray-200 hover:bg-gray-900"
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Load more
                        </Button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </>
        ) : !vendorsMode ? (
          <div className="mt-10 rounded-2xl border border-green-900/25 bg-gray-900/50 p-8 text-center text-gray-400 shadow-sm">
            Enable{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-sm text-gray-200">
              NEXT_PUBLIC_USE_VENDORS_TABLE=1
            </code>{" "}
            for map view and Smokers Club ordering.
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-gray-500">
            You&apos;re in map view — switch to <strong className="text-gray-300">List</strong> for cards and load more.
          </p>
        )}
      </div>
    </div>
  );
}

function DiscoverSuspenseFallback() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-16 animate-pulse sm:px-6 lg:px-8">
        <div className="h-10 w-56 rounded-lg bg-gray-800" />
        <div className="h-14 max-w-xl rounded-2xl bg-gray-800" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-800" />
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
