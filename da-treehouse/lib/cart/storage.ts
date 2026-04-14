import type { CartLine } from "@/lib/cart/types";
import { CART_STORAGE_KEY } from "@/lib/cart/types";

export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(isCartLine);
  } catch {
    return [];
  }
}

function isCartLine(x: unknown): x is CartLine {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.productId === "string" &&
    typeof o.name === "string" &&
    typeof o.priceCents === "number" &&
    typeof o.qty === "number" &&
    o.qty > 0 &&
    typeof o.vendorId === "string" &&
    typeof o.vendorName === "string" &&
    typeof o.vendorSlug === "string"
  );
}

export function serializeCart(lines: CartLine[]): string {
  return JSON.stringify(lines);
}

export function loadCartFromStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return parseCart(localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveCartToStorage(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, serializeCart(lines));
  } catch {
    /* */
  }
}
