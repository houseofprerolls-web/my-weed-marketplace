"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

export function CartHeaderLink({ inverse }: { inverse?: boolean }) {
  const { itemCount, hydrated } = useCart();
  const linkClass = inverse
    ? "text-sm font-medium text-neutral-300 hover:text-white tabular-nums"
    : "text-sm font-medium text-foreground hover:underline tabular-nums";
  const idleClass = inverse
    ? "text-sm text-neutral-500 tabular-nums"
    : "text-muted-foreground text-sm tabular-nums";

  if (!hydrated) {
    return <span className={idleClass}>Cart</span>;
  }
  return (
    <Link href="/cart" className={linkClass}>
      Cart{itemCount > 0 ? ` (${itemCount})` : ""}
    </Link>
  );
}
