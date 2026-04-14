"use client";

import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function ProductAddToCartClient({
  productId,
  name,
  priceCents,
  inStock,
  vendorId,
  vendorName,
  vendorSlug,
}: {
  productId: string;
  name: string;
  priceCents: number;
  inStock: boolean;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <AddToCartButton
        productId={productId}
        name={name}
        priceCents={priceCents}
        vendorId={vendorId}
        vendorName={vendorName}
        vendorSlug={vendorSlug}
        disabled={!inStock}
        size="default"
      />
    </div>
  );
}
