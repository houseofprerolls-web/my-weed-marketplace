"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ProductGrid,
  type CatalogProduct,
} from "@/components/catalog/ProductGrid";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";

function formatError(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export function VendorStoreMenu({
  vendorId,
  vendorName,
  vendorSlug,
}: {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/catalog/products?vendorId=${encodeURIComponent(vendorId)}`
      );
      if (!res.ok) throw new Error(`Failed to load menu (${res.status}).`);
      const json = (await res.json()) as { products: CatalogProduct[] };
      setProducts(json.products ?? []);
    } catch (e) {
      setError(formatError(e));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="relative pb-24 sm:pb-8">
      <h2 className="mb-3 text-lg font-semibold">Menu</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Add items to your cart, then check out. One store per cart.
      </p>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <ProductGrid
        products={products}
        selectedVendorName={vendorName}
        loading={loading}
        showAddToCart
      />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:static sm:z-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 sm:justify-start">
          <Button variant="secondary" asChild className="flex-1 sm:flex-none">
            <Link href="/cart">View cart</Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/checkout">Checkout</Link>
          </Button>
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/">{SITE_NAME} home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
