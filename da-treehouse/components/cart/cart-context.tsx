"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartLine } from "@/lib/cart/types";
import {
  loadCartFromStorage,
  saveCartToStorage,
} from "@/lib/cart/storage";

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  addItem: (item: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadCartFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCartToStorage(lines);
  }, [lines, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartLine, "qty"> & { qty?: number }) => {
      const qty = Math.max(1, item.qty ?? 1);
      setLines((prev) => {
        let base = prev;
        if (
          prev.length > 0 &&
          prev[0]!.vendorId !== item.vendorId
        ) {
          const ok = window.confirm(
            "Your cart is from a different store. Clear it and add this item?"
          );
          if (!ok) return prev;
          base = [];
        }
        const idx = base.findIndex((l) => l.productId === item.productId);
        if (idx >= 0) {
          return base.map((l, i) =>
            i === idx
              ? {
                  ...l,
                  qty: l.qty + qty,
                  priceCents: item.priceCents,
                  name: item.name,
                  vendorName: item.vendorName,
                  vendorSlug: item.vendorSlug,
                }
              : l
          );
        }
        return [
          ...base,
          {
            productId: item.productId,
            name: item.name,
            priceCents: item.priceCents,
            qty,
            vendorId: item.vendorId,
            vendorName: item.vendorName,
            vendorSlug: item.vendorSlug,
          },
        ];
      });
    },
    []
  );

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      if (qty < 1) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) =>
        l.productId === productId ? { ...l, qty } : l
      );
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const itemCount = useMemo(
    () => lines.reduce((s, l) => s + l.qty, 0),
    [lines]
  );
  const subtotalCents = useMemo(
    () => lines.reduce((s, l) => s + l.priceCents * l.qty, 0),
    [lines]
  );

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      subtotalCents,
      addItem,
      setQty,
      removeLine,
      clearCart,
      hydrated,
    }),
    [
      lines,
      itemCount,
      subtotalCents,
      addItem,
      setQty,
      removeLine,
      clearCart,
      hydrated,
    ]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
