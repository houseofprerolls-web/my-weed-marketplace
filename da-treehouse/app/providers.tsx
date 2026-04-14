"use client";

import { CartProvider } from "@/components/cart/cart-context";
import { FeatureFlagsProvider } from "@/lib/feature-flags/context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FeatureFlagsProvider>
      <CartProvider>{children}</CartProvider>
    </FeatureFlagsProvider>
  );
}
