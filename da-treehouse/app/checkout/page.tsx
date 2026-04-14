"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SITE_NAME } from "@/lib/site";

type Fulfillment = "pickup" | "delivery" | "curbside";

export default function CheckoutPage() {
  const { lines, subtotalCents, clearCart, hydrated } = useCart();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const placeOrder = useCallback(async () => {
    if (lines.length === 0 || !userId) return;
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createBrowserSupabase();
      const vendorId = lines[0]!.vendorId;
      const items = lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        priceCents: l.priceCents,
        qty: l.qty,
      }));

      const { data, error: insErr } = await supabase
        .from("orders")
        .insert({
          consumer_id: userId,
          vendor_id: vendorId,
          items,
          total_cents: subtotalCents,
          status: "pending",
          pickup_or_delivery: fulfillment,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      clearCart();
      setDoneId(data?.id ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }, [lines, userId, subtotalCents, fulfillment, clearCart]);

  if (!hydrated || authLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (doneId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Order placed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference <code className="text-xs">{doneId.slice(0, 8)}…</code>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          The store will see your request in their dashboard.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-muted-foreground">
        <p>Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block text-primary underline">
          Find stores
        </Link>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Log in to checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We need your account to attach this order.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/login?next=/checkout">Log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {lines[0]!.vendorName} · ${(subtotalCents / 100).toFixed(2)}
      </p>

      <div className="mt-6 grid gap-2">
        <Label>Fulfillment</Label>
        <select
          className="border-input h-9 rounded-lg border bg-transparent px-2 text-sm"
          value={fulfillment}
          onChange={(e) =>
            setFulfillment(e.target.value as Fulfillment)
          }
        >
          <option value="pickup">Pickup</option>
          <option value="delivery">Delivery</option>
          <option value="curbside">Curbside</option>
        </select>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={submitting}
          onClick={() => void placeOrder()}
        >
          {submitting ? "Placing…" : "Place order"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {SITE_NAME} does not sell cannabis. Orders are requests to licensed
        retailers; fulfillment follows store policy and local law.
      </p>
    </div>
  );
}
