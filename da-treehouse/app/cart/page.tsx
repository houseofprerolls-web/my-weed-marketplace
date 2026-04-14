"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_NAME } from "@/lib/site";

export default function CartPage() {
  const { lines, subtotalCents, setQty, removeLine, clearCart, hydrated } =
    useCart();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-sm text-muted-foreground">
        Loading cart…
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <p className="mt-2 text-sm text-muted-foreground">Nothing here yet.</p>
        <Button className="mt-6" asChild>
          <Link href="/">Find stores</Link>
        </Button>
      </div>
    );
  }

  const store = lines[0]!;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Your cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ordering from{" "}
        <Link
          href={`/vendors/${store.vendorSlug}`}
          className="font-medium text-primary hover:underline"
        >
          {store.vendorName}
        </Link>
      </p>

      <ul className="mt-6 divide-y rounded-xl border">
        {lines.map((l) => (
          <li
            key={l.productId}
            className="flex flex-wrap items-center gap-3 px-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                ${(l.priceCents / 100).toFixed(2)} each
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="h-8 w-16"
                value={l.qty}
                onChange={(e) =>
                  setQty(l.productId, Math.max(1, parseInt(e.target.value, 10) || 1))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeLine(l.productId)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between text-lg font-semibold">
        <span>Subtotal</span>
        <span>${(subtotalCents / 100).toFixed(2)}</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {SITE_NAME} does not process payments here. This creates a pickup /
        delivery request for the store.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/checkout">Checkout</Link>
        </Button>
        <Button variant="outline" onClick={() => clearCart()}>
          Clear cart
        </Button>
      </div>
    </div>
  );
}
