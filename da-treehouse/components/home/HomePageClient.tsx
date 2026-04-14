"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { VendorMap, type VendorMarker } from "@/components/catalog/VendorMap";
import { ProductGrid, type CatalogProduct } from "@/components/catalog/ProductGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isMasterAccountEmail } from "@/lib/auth/master";
import {
  AREA_LOCAL_STORAGE_KEY,
  normalizeUsZip,
  parseStoredArea,
  writeStoredArea,
  type AreaPrefs,
} from "@/lib/area/storage";
import { GEO_LOCAL_STORAGE_KEY, parseStoredGeo } from "@/lib/geo/storage";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { DispensaryThumbCard } from "@/components/home/DispensaryThumbCard";
import type { PremiumCompareRow } from "@/app/api/analytics/market-premium-compare/route";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FEATURED_DISPENSARY_NAME,
  FEATURED_DISPENSARY_SLUG,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/site";
import { useFeatureFlag } from "@/lib/feature-flags/context";

type ShopsPanel = "featured" | "all";

function formatError(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
      />
    </svg>
  );
}

export default function HomePageClient() {
  const flagMap = useFeatureFlag("catalog_map");
  const flagProducts = useFeatureFlag("catalog_products");
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const sync = (email: string | undefined | null) => {
      setIsMaster(isMasterAccountEmail(email ?? null));
    };
    void supabase.auth.getSession().then(({ data: { session } }) => {
      sync(session?.user?.email);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session?.user?.email);
    });
    return () => subscription.unsubscribe();
  }, []);

  const mapsKeyConfigured = Boolean(
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
  );
  const showMap = isMaster || flagMap || mapsKeyConfigured;
  const showProducts = isMaster || flagProducts;

  const [area, setArea] = useState<AreaPrefs | null>(null);
  const [hydratedArea, setHydratedArea] = useState(false);
  const [zipInput, setZipInput] = useState("");
  const [areaLoading, setAreaLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<VendorMarker[]>([]);
  const [premiumVendors, setPremiumVendors] = useState<VendorMarker[]>([]);
  const [nearbyVendors, setNearbyVendors] = useState<VendorMarker[]>([]);
  const [marketMeta, setMarketMeta] = useState<{
    id: string;
    slug: string;
    name: string;
  } | null>(null);
  const [shopsPanel, setShopsPanel] = useState<ShopsPanel>("featured");
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState<string | null>(null);
  const [exploreVendors, setExploreVendors] = useState<VendorMarker[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareRows, setCompareRows] = useState<PremiumCompareRow[]>([]);
  const [compareMarketLabel, setCompareMarketLabel] = useState<string | null>(
    null
  );

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    const fromStorage = parseStoredArea(
      localStorage.getItem(AREA_LOCAL_STORAGE_KEY)
    );
    if (fromStorage) {
      setArea(fromStorage);
      setHydratedArea(true);
      return;
    }
    const geo = parseStoredGeo(localStorage.getItem(GEO_LOCAL_STORAGE_KEY));
    if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
      setArea({
        zip: "",
        label: geo.geo_state
          ? `Near ${geo.geo_state} (device)`
          : "Near your device location",
        lat: geo.lat,
        lng: geo.lng,
        updatedAt: geo.updatedAt,
        source: "geo",
      });
    }
    setHydratedArea(true);
  }, []);

  const selectedVendorName = useMemo(() => {
    if (!selectedVendorId) return null;
    return vendors.find((v) => v.vendorId === selectedVendorId)?.name ?? null;
  }, [selectedVendorId, vendors]);

  const loadVendors = useCallback(async (prefs: AreaPrefs) => {
    setVendorsLoading(true);
    setVendorsError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("lat", String(prefs.lat));
      qs.set("lng", String(prefs.lng));
      qs.set("radiusMiles", "100");
      if (prefs.source === "zip" && prefs.zip) qs.set("zip", prefs.zip);

      const res = await fetch(`/api/catalog/vendors?${qs}`);
      if (!res.ok) throw new Error(`Failed to load stores (${res.status}).`);
      const json = (await res.json()) as {
        premium?: VendorMarker[];
        nearby?: VendorMarker[];
        vendors?: VendorMarker[];
        market?: { id: string; slug: string; name: string } | null;
      };
      const prem = json.premium ?? [];
      const near = json.nearby ?? [];
      const list = json.vendors ?? [...prem, ...near];
      setPremiumVendors(prem);
      setNearbyVendors(near);
      setMarketMeta(json.market ?? null);
      setVendors(list);
      setSelectedVendorId((prev) => {
        if (prev && list.some((v) => v.vendorId === prev)) return prev;
        return list[0]?.vendorId ?? null;
      });
    } catch (err) {
      setVendorsError(formatError(err));
      setVendors([]);
      setPremiumVendors([]);
      setNearbyVendors([]);
      setMarketMeta(null);
      setSelectedVendorId(null);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  const loadExploreVendors = useCallback(async () => {
    setExploreLoading(true);
    setExploreError(null);
    try {
      const res = await fetch("/api/catalog/vendors");
      if (!res.ok) {
        throw new Error(`Failed to load map vendors (${res.status}).`);
      }
      const json = (await res.json()) as {
        vendors?: VendorMarker[];
        error?: string;
      };
      if (json.error) throw new Error(json.error);
      setExploreVendors(json.vendors ?? []);
    } catch (err) {
      setExploreError(formatError(err));
      setExploreVendors([]);
    } finally {
      setExploreLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydratedArea || !area) return;
    void loadVendors(area);
  }, [area, hydratedArea, loadVendors]);

  useEffect(() => {
    if (!showMap || !hydratedArea || area) return;
    void loadExploreVendors();
  }, [showMap, hydratedArea, area, loadExploreVendors]);

  const loadProducts = useCallback(async (vendorId: string | null) => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const qs = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : "";
      const res = await fetch(`/api/catalog/products${qs}`);
      if (!res.ok)
        throw new Error(`Failed to load products (${res.status}).`);
      const json = (await res.json()) as { products: CatalogProduct[] };
      setProducts(json.products ?? []);
    } catch (err) {
      setProductsError(formatError(err));
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showProducts || !selectedVendorId) return;
    void loadProducts(selectedVendorId);
  }, [loadProducts, selectedVendorId, showProducts]);

  async function onZipSearch(e: React.FormEvent) {
    e.preventDefault();
    setAreaError(null);
    const z = normalizeUsZip(zipInput);
    if (!z) {
      setAreaError("Enter a valid US ZIP code.");
      return;
    }
    setAreaLoading(true);
    try {
      const res = await fetch(`/api/geocode-zip?zip=${encodeURIComponent(z)}`);
      const json = (await res.json()) as {
        error?: string;
        zip?: string;
        lat?: number;
        lng?: number;
        label?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not look up ZIP.");
      const prefs: AreaPrefs = {
        zip: json.zip ?? z,
        label: json.label ?? `${z}`,
        lat: json.lat!,
        lng: json.lng!,
        updatedAt: new Date().toISOString(),
        source: "zip",
      };
      writeStoredArea(prefs);
      setArea(prefs);
      setZipInput("");
    } catch (err) {
      setAreaError(formatError(err));
    } finally {
      setAreaLoading(false);
    }
  }

  function useMyLocation() {
    setAreaError(null);
    if (!navigator.geolocation) {
      setAreaError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const prefs: AreaPrefs = {
          zip: "",
          label: "Near your location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          updatedAt: new Date().toISOString(),
          source: "geo",
        };
        writeStoredArea(prefs);
        setArea(prefs);
        setLocating(false);
      },
      () => {
        setAreaError("Location permission denied or unavailable.");
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 15_000 }
    );
  }

  async function openPremiumCompare() {
    if (!area?.zip) return;
    setCompareOpen(true);
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch(
        `/api/analytics/market-premium-compare?zip=${encodeURIComponent(area.zip)}`
      );
      const json = (await res.json()) as {
        rows?: PremiumCompareRow[];
        market?: { name: string } | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not load comparison.");
      setCompareRows(json.rows ?? []);
      setCompareMarketLabel(json.market?.name ?? marketMeta?.name ?? null);
    } catch (err) {
      setCompareError(formatError(err));
      setCompareRows([]);
      setCompareMarketLabel(null);
    } finally {
      setCompareLoading(false);
    }
  }

  function clearArea() {
    try {
      localStorage.removeItem(AREA_LOCAL_STORAGE_KEY);
    } catch {
      /* */
    }
    setArea(null);
    setVendors([]);
    setPremiumVendors([]);
    setNearbyVendors([]);
    setMarketMeta(null);
    setSelectedVendorId(null);
    setProducts([]);
  }

  if (!showMap && !showProducts) {
    return (
      <div className="flex min-h-full flex-1 flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">{SITE_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Listings are temporarily unavailable.
        </p>
      </div>
    );
  }

  const gridClass =
    showMap && showProducts
      ? "grid gap-6 lg:grid-cols-[1.25fr_1fr]"
      : "grid gap-6";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#fafafa]">
      {/* Light, directory-style hero — white space + search anchor */}
      <section className="border-b border-neutral-200/80 bg-white px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-green)]">
            Licensed cannabis · 21+
          </p>
          <h1 className="font-display mt-2 text-balance text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
            Find your treehouse.
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-neutral-600 sm:text-base">
            {SITE_TAGLINE}
          </p>

          <form
            onSubmit={onZipSearch}
            className="mt-8 max-w-3xl"
            aria-label="Search stores by ZIP"
          >
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-neutral-200 bg-white p-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-[var(--brand-red)]/40 focus-within:shadow-md sm:flex-row sm:items-stretch">
              <label className="flex min-h-[48px] flex-1 items-center gap-2.5 px-3 text-neutral-400">
                <SearchGlyph className="h-5 w-5 shrink-0" />
                <input
                  type="search"
                  name="q"
                  readOnly
                  tabIndex={-1}
                  placeholder="Search menus, strains, stores…"
                  className="min-w-0 flex-1 cursor-default bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400"
                  title="Coming soon — use ZIP to load shops"
                />
              </label>
              <div className="flex items-center gap-0 border-t border-neutral-100 pt-1 sm:border-t-0 sm:border-l sm:pt-0">
                <div className="flex min-h-[44px] flex-1 items-center gap-2 px-3 sm:min-w-[140px] sm:flex-none">
                  <MapPinIcon className="h-5 w-5 shrink-0 text-[var(--brand-red)]" />
                  <Input
                    id="home-zip"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="ZIP code"
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value)}
                    className="h-10 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 shrink-0 rounded-xl bg-[var(--brand-red)] px-6 font-semibold text-white hover:bg-[var(--brand-red-hover)] sm:h-[44px]"
                  disabled={areaLoading}
                >
                  {areaLoading ? "…" : "Search"}
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs font-medium text-neutral-600"
                disabled={locating}
                onClick={useMyLocation}
              >
                {locating ? "Locating…" : "Use my location"}
              </Button>
              {area ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-neutral-500"
                  onClick={clearArea}
                >
                  Clear area
                </Button>
              ) : null}
            </div>
            {areaError ? (
              <p className="mt-2 text-sm text-red-600">{areaError}</p>
            ) : null}
          </form>

          <nav
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-neutral-200 pb-3 text-sm font-medium text-neutral-600"
            aria-label="Browse"
          >
            <span className="text-neutral-900">Dispensaries</span>
            <Link href="/catalog" className="hover:text-[var(--brand-red)]">
              Map view
            </Link>
            <Link href="/strains" className="hover:text-[var(--brand-red)]">
              Strains
            </Link>
            <Link
              href={`/vendors/${FEATURED_DISPENSARY_SLUG}`}
              className="hover:text-[var(--brand-red)]"
            >
              Featured shop
            </Link>
            <Link href="/cart" className="hover:text-[var(--brand-red)]">
              Cart
            </Link>
          </nav>

          <Link
            href={`/vendors/${FEATURED_DISPENSARY_SLUG}`}
            className="mt-5 flex max-w-xl items-start gap-4 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 transition hover:border-[var(--brand-red)]/35 hover:bg-white hover:shadow-sm"
          >
            <span
              className="mt-0.5 hidden h-12 w-1.5 shrink-0 rounded-full bg-[var(--brand-red)] sm:block"
              aria-hidden
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-red)]">
                Staff pick
              </p>
              <p className="font-display text-lg font-semibold text-neutral-900">
                {FEATURED_DISPENSARY_NAME}
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">
                Full menu, cart &amp; checkout — live on {SITE_NAME}.
              </p>
            </div>
          </Link>

          {area ? (
            <div className="mt-5 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm">
              <MapPinIcon className="h-4 w-4 text-[var(--brand-red)]" />
              <span className="font-medium text-neutral-500">Area</span>
              <span className="font-semibold text-neutral-900">
                {area.label}
              </span>
              {area.source === "zip" && area.zip ? (
                <span className="text-neutral-400">· {area.zip}</span>
              ) : null}
            </div>
          ) : hydratedArea ? (
            <p className="mt-5 max-w-lg text-sm text-neutral-500">
              Enter your ZIP to load storefront tiles for your California listing
              region—compact cards, same idea as the big directories, with a
              DaTreehouse edge.
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        {!area ? (
          <div className="space-y-6">
            {showMap ? (
              <Card className="overflow-hidden border-neutral-200 shadow-sm">
                <CardHeader className="border-b border-neutral-100 bg-white pb-3">
                  <CardTitle className="font-display text-lg font-semibold">
                    Shop map
                  </CardTitle>
                  <p className="text-sm font-normal text-neutral-500">
                    All locations with coordinates. Enter your ZIP above to
                    filter to your area and open menus here.
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  {exploreError ? (
                    <div className="rounded-xl border bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
                      {exploreError}
                    </div>
                  ) : (
                    <VendorMap
                      vendors={exploreLoading ? [] : exploreVendors}
                      selectedVendorId={selectedVendorId}
                      onSelectVendor={(id) => setSelectedVendorId(id)}
                    />
                  )}
                </CardContent>
              </Card>
            ) : null}
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-14 text-center shadow-sm">
              <p className="font-display text-lg font-medium text-neutral-800">
                Set your ZIP to see shops
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
                We&apos;ll load premium spots and nearby dispensaries as tight
                tiles—pick one to browse the menu on this page.
              </p>
            </div>
          </div>
        ) : (
          <>
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-900">
                    Dispensaries near you
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    {vendorsLoading
                      ? "Loading…"
                      : vendors.length
                        ? `${vendors.length} dispensaries in range`
                        : "No stores in range—try another ZIP."}
                    {area?.source === "geo" && !area.zip ? (
                      <span className="mt-1 block text-amber-800">
                        Add a ZIP to unlock regional premium ordering (California
                        markets).
                      </span>
                    ) : null}
                  </p>
                  {area?.zip && marketMeta ? (
                    <p className="mt-1 text-xs text-neutral-500">
                      Region:{" "}
                      <span className="font-semibold text-neutral-800">
                        {marketMeta.name}
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {area?.zip ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={openPremiumCompare}
                    >
                      Compare premium slots
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => area && loadVendors(area)}
                    disabled={vendorsLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {vendorsError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
                  {vendorsError}
                </div>
              ) : (
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                  <nav
                    aria-label="Shop list mode"
                    className="flex shrink-0 flex-row gap-2 lg:w-56 lg:flex-col lg:gap-2"
                  >
                    <p className="hidden px-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 lg:block">
                      View
                    </p>
                    <Button
                      type="button"
                      variant={shopsPanel === "featured" ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full lg:w-full lg:justify-start ${shopsPanel === "featured" ? "bg-[var(--brand-red)] hover:bg-[var(--brand-red-hover)]" : "border-neutral-300"}`}
                      onClick={() => setShopsPanel("featured")}
                    >
                      Premium &amp; nearby
                    </Button>
                    <Button
                      type="button"
                      variant={shopsPanel === "all" ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full lg:w-full lg:justify-start ${shopsPanel === "all" ? "bg-neutral-900 hover:bg-neutral-800" : "border-neutral-300"}`}
                      onClick={() => setShopsPanel("all")}
                    >
                      All shops
                    </Button>
                  </nav>

                  <div className="min-w-0 flex-1 space-y-8">
                    {shopsPanel === "featured" ? (
                      <>
                        <div>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display text-lg font-semibold text-neutral-900 sm:text-xl">
                              Premium in{" "}
                              {marketMeta?.name ?? "your region"}
                            </h3>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto shrink-0 gap-1 px-0 text-sm font-semibold text-[var(--brand-red)]"
                              onClick={() => setShopsPanel("all")}
                            >
                              View all →
                            </Button>
                          </div>
                          {!area?.zip ? (
                            <p className="text-sm text-muted-foreground">
                              Premium top 10 uses your ZIP to pick a California
                              listing region (broader than city-level).
                            </p>
                          ) : vendorsLoading ? null : premiumVendors.length ===
                            0 ? (
                            <p className="text-sm text-muted-foreground">
                              No premium slots for this region yet—admins can
                              assign them in Admin → Regional premium slots.
                            </p>
                          ) : (
                            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-1 scroll-smooth sm:mx-0 sm:gap-4 sm:px-0">
                              {premiumVendors.map((v) => (
                                <div
                                  key={v.vendorId}
                                  className="w-[158px] shrink-0 snap-start sm:w-[168px]"
                                >
                                  <DispensaryThumbCard
                                    vendor={v}
                                    selected={selectedVendorId === v.vendorId}
                                    onSelect={() =>
                                      setSelectedVendorId(v.vendorId)
                                    }
                                    badge="Premium"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display text-lg font-semibold text-neutral-900 sm:text-xl">
                              More nearby
                            </h3>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto shrink-0 gap-1 px-0 text-sm font-semibold text-[var(--brand-red)]"
                              onClick={() => setShopsPanel("all")}
                            >
                              View all →
                            </Button>
                          </div>
                          {vendorsLoading ? null : nearbyVendors.length ===
                            0 ? (
                            <p className="text-sm text-muted-foreground">
                              No additional shops in this radius.
                            </p>
                          ) : (
                            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-1 scroll-smooth sm:mx-0 sm:gap-4 sm:px-0">
                              {nearbyVendors.map((v) => (
                                <div
                                  key={v.vendorId}
                                  className="w-[158px] shrink-0 snap-start sm:w-[168px]"
                                >
                                  <DispensaryThumbCard
                                    vendor={v}
                                    selected={selectedVendorId === v.vendorId}
                                    onSelect={() =>
                                      setSelectedVendorId(v.vendorId)
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div>
                        <h3 className="font-display mb-4 text-lg font-semibold text-neutral-900">
                          All dispensaries
                        </h3>
                        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
                          {(vendorsLoading ? [] : vendors).map((v) => (
                            <li key={v.vendorId}>
                              <DispensaryThumbCard
                                vendor={v}
                                selected={selectedVendorId === v.vendorId}
                                onSelect={() => setSelectedVendorId(v.vendorId)}
                                badge={
                                  premiumVendors.some(
                                    (p) => p.vendorId === v.vendorId
                                  )
                                    ? "Premium"
                                    : undefined
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <div className={gridClass}>
              {showMap ? (
                <Card className="overflow-hidden border-neutral-200 shadow-sm">
                  <CardHeader className="border-b border-neutral-100 bg-white pb-3">
                    <CardTitle className="font-display text-lg font-semibold">
                      Map
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vendorsError ? (
                      <div className="rounded-xl border bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
                        {vendorsError}
                      </div>
                    ) : (
                      <VendorMap
                        vendors={vendorsLoading ? [] : vendors}
                        selectedVendorId={selectedVendorId}
                        onSelectVendor={(id) => setSelectedVendorId(id)}
                      />
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {showProducts ? (
                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="border-b border-neutral-100 bg-white pb-3">
                    <CardTitle className="font-display text-lg font-semibold">
                      Menu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {vendors.length > 1 ? (
                      <div className="grid gap-2">
                        <Label htmlFor="home-vendor">Store</Label>
                        <select
                          id="home-vendor"
                          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                          value={selectedVendorId ?? ""}
                          onChange={(e) =>
                            setSelectedVendorId(e.target.value || null)
                          }
                        >
                          {vendors.map((v) => (
                            <option key={v.vendorId} value={v.vendorId}>
                              {v.name}
                              {v.distanceMiles != null
                                ? ` · ${v.distanceMiles < 10 ? v.distanceMiles.toFixed(1) : Math.round(v.distanceMiles)} mi`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {productsError ? (
                      <div className="rounded-xl border bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
                        {productsError}
                      </div>
                    ) : (
                      <ProductGrid
                        products={products}
                        selectedVendorName={selectedVendorName}
                        loading={productsLoading}
                        showAddToCart
                      />
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </>
        )}

        <p className="text-center text-xs text-neutral-500">
          <Link
            href="/catalog"
            className="font-medium text-neutral-700 underline-offset-2 hover:text-[var(--brand-red)] hover:underline"
          >
            Classic map &amp; grid
          </Link>
          <span className="mx-2 text-neutral-300">·</span>
          <Link
            href="/strains"
            className="font-medium text-neutral-700 underline-offset-2 hover:text-[var(--brand-red)] hover:underline"
          >
            Strain guide
          </Link>
        </p>
      </div>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Premium slot comparison</DialogTitle>
            <DialogDescription>
              {compareMarketLabel
                ? `Premium listings (slots 1–10) for ${compareMarketLabel}.`
                : "Premium listings for your ZIP’s region."}
            </DialogDescription>
          </DialogHeader>
          {compareLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : compareError ? (
            <p className="text-sm text-destructive">{compareError}</p>
          ) : compareRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No premium rows for this region.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Dispensary</th>
                    <th className="py-2 pr-2">Products</th>
                    <th className="py-2 pr-2">Avg price</th>
                    <th className="py-2 pr-2">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((r) => (
                    <tr key={r.vendorId} className="border-b border-border/60">
                      <td className="py-2 pr-2 tabular-nums">
                        {r.slotRank + 1}
                      </td>
                      <td className="py-2 pr-2 font-medium">{r.name}</td>
                      <td className="py-2 pr-2 tabular-nums">
                        {r.productCount}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">
                        ${(r.avgPriceCents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 pr-2">
                        {r.reviewAvg != null
                          ? `★ ${r.reviewAvg} (${r.reviewCount})`
                          : `— (${r.reviewCount})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
