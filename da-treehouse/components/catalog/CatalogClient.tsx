"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { VendorMap, type VendorMarker } from "@/components/catalog/VendorMap";
import { ProductGrid, type CatalogProduct } from "@/components/catalog/ProductGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useFeatureFlag } from "@/lib/feature-flags/context";
import { SITE_NAME } from "@/lib/site";

function formatError(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export default function CatalogClient() {
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

  const [vendors, setVendors] = useState<VendorMarker[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState<string | null>(null);

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    null
  );

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const selectedVendorName = useMemo(() => {
    if (!selectedVendorId) return null;
    return vendors.find((v) => v.vendorId === selectedVendorId)?.name ?? null;
  }, [selectedVendorId, vendors]);

  const loadVendors = useCallback(async () => {
    setVendorsLoading(true);
    setVendorsError(null);
    try {
      const res = await fetch("/api/catalog/vendors");
      if (!res.ok) throw new Error(`Failed to load vendors (${res.status}).`);
      const json = (await res.json()) as { vendors: VendorMarker[] };
      const list = json.vendors ?? [];
      setVendors(list);
      setSelectedVendorId((prev) => {
        if (prev && list.some((v) => v.vendorId === prev)) return prev;
        return list[0]?.vendorId ?? null;
      });
    } catch (err) {
      setVendorsError(formatError(err));
      setVendors([]);
      setSelectedVendorId(null);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

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
    if (showMap || showProducts) {
      loadVendors();
    }
  }, [loadVendors, showMap, showProducts]);

  useEffect(() => {
    if (!showProducts || !selectedVendorId) return;
    loadProducts(selectedVendorId);
  }, [loadProducts, selectedVendorId, showProducts]);

  if (!showMap && !showProducts) {
    return (
      <div className="flex min-h-full flex-1 flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">{SITE_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          The catalog is temporarily unavailable.
        </p>
      </div>
    );
  }

  const gridClass =
    showMap && showProducts
      ? "grid gap-4 lg:grid-cols-[1.5fr_1fr]"
      : "grid gap-4";

  return (
    <div className="flex min-h-full flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{SITE_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Explore approved, live vendors and their products.
        </p>
      </div>

      <div className={gridClass}>
        {showMap ? (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vendors Map</CardTitle>
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

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {vendorsLoading
                    ? "Loading vendors..."
                    : vendors.length
                      ? `${vendors.length} vendors`
                      : "No vendors found"}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => loadVendors()}
                  disabled={vendorsLoading}
                >
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showProducts ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showMap && vendors.length > 1 ? (
                <div className="grid gap-2">
                  <Label htmlFor="vendor-select">Vendor</Label>
                  <select
                    id="vendor-select"
                    className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
                    value={selectedVendorId ?? ""}
                    onChange={(e) =>
                      setSelectedVendorId(e.target.value || null)
                    }
                  >
                    {vendors.map((v) => (
                      <option key={v.vendorId} value={v.vendorId}>
                        {v.name}
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

              <div className="text-xs text-muted-foreground">
                {showMap
                  ? selectedVendorName
                    ? "Tip: click a marker to filter products."
                    : "Select a vendor on the map."
                  : selectedVendorName
                    ? `Showing products for ${selectedVendorName}.`
                    : "Choose a vendor above."}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
