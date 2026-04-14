"use client";

import React from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CatalogProduct = {
  productId: string;
  name: string;
  category: string;
  priceCents: number;
  inventoryCount: number;
  inStock: boolean;
  createdAt: string;
  imageUrl?: string | null;
  vendor: { id: string; name: string; slug: string } | null;
  strain: { id: string; name: string; slug: string; type: string } | null;
};

export function ProductGrid({
  products,
  selectedVendorName,
  loading,
  showAddToCart = false,
}: {
  products: CatalogProduct[];
  selectedVendorName: string | null;
  loading: boolean;
  /** Show add-to-cart when `vendor` is present on each product */
  showAddToCart?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            {loading
              ? "Loading products..."
              : selectedVendorName
                ? `Products from ${selectedVendorName}`
                : "Products"}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          No products found.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const dollars = (p.priceCents / 100).toFixed(2);
            return (
              <Card key={p.productId} className="h-full overflow-hidden">
                {p.imageUrl ? (
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link
                      href={`/products/${p.productId}`}
                      className="hover:underline"
                    >
                      {p.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.vendor ? (
                    <div className="text-sm text-muted-foreground">
                      <Link
                        href={`/vendors/${p.vendor.slug}`}
                        className="text-primary hover:underline"
                      >
                        {p.vendor.name}
                      </Link>
                    </div>
                  ) : null}
                  <div className="text-sm text-muted-foreground">
                    {p.strain?.name ? (
                      <>
                        Strain:{" "}
                        <Link
                          href={`/strains/${p.strain.slug}`}
                          className="text-primary hover:underline"
                        >
                          {p.strain.name}
                        </Link>
                      </>
                    ) : (
                      "Strain: —"
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Category: {p.category}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">
                      ${dollars}
                    </div>
                    <div
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        p.inStock
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                      ].join(" ")}
                    >
                      {p.inStock ? "In stock" : "Out of stock"}
                    </div>
                  </div>
                  {showAddToCart && p.vendor ? (
                    <AddToCartButton
                      productId={p.productId}
                      name={p.name}
                      priceCents={p.priceCents}
                      vendorId={p.vendor.id}
                      vendorName={p.vendor.name}
                      vendorSlug={p.vendor.slug}
                      disabled={!p.inStock}
                      className="mt-2 w-full"
                    />
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

