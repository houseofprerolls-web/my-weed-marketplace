"use client";

import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  productId,
  name,
  priceCents,
  vendorId,
  vendorName,
  vendorSlug,
  disabled,
  size = "sm",
  className,
}: {
  productId: string;
  name: string;
  priceCents: number;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const { addItem } = useCart();

  return (
    <Button
      type="button"
      size={size}
      variant="secondary"
      className={className}
      disabled={disabled}
      onClick={() =>
        addItem({
          productId,
          name,
          priceCents,
          vendorId,
          vendorName,
          vendorSlug,
          qty: 1,
        })
      }
    >
      Add to cart
    </Button>
  );
}
