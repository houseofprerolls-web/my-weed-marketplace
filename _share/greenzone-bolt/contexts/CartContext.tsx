"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'datreehouse_cart_v3';
const LEGACY_STORAGE_KEY = 'cart';

export type VendorsCartLine = {
  kind: 'vendors';
  productId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  priceCents: number;
  quantity: number;
  image: string | null;
  thc: number | null;
  cbd: number | null;
};

export type LegacyCartLine = {
  kind: 'legacy';
  productId: string;
  serviceId: string;
  /** Dispensary / service name (one store per cart). */
  serviceName: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  thc: number | null;
  weight: string | null;
};

export type CartItem = VendorsCartLine | LegacyCartLine;

export type AddItemResult =
  | { ok: true }
  | { ok: false; reason: 'DIFFERENT_VENDOR'; currentVendorName: string }
  | { ok: false; reason: 'DIFFERENT_SERVICE'; currentServiceLabel: string }
  | { ok: false; reason: 'SCHEMA_MIX' };

type CartContextType = {
  items: CartItem[];
  cartKind: 'empty' | 'vendors' | 'legacy';
  addItem: (item: Omit<VendorsCartLine, 'kind' | 'quantity'> & { quantity?: number }) => AddItemResult;
  addLegacyItem: (item: Omit<LegacyCartLine, 'kind' | 'quantity'> & { quantity?: number }) => AddItemResult;
  replaceCartWith: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  /** Subtotal in dollars (UI / legacy checkout). */
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function migrateRawToItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (o.kind === 'vendors') {
      out.push(o as unknown as VendorsCartLine);
      continue;
    }
    if (o.kind === 'legacy') {
      out.push(o as unknown as LegacyCartLine);
      continue;
    }
    if (typeof o.serviceId === 'string') {
      out.push({
        kind: 'legacy',
        productId: String(o.productId ?? ''),
        serviceId: o.serviceId,
        serviceName: typeof o.serviceName === 'string' ? o.serviceName : 'Saved cart',
        name: String(o.name ?? 'Product'),
        price: typeof o.price === 'number' && Number.isFinite(o.price) ? o.price : 0,
        quantity: typeof o.quantity === 'number' && o.quantity > 0 ? Math.floor(o.quantity) : 1,
        image: typeof o.image === 'string' ? o.image : null,
        thc: typeof o.thc === 'number' ? o.thc : null,
        weight: typeof o.weight === 'string' ? o.weight : null,
      });
      continue;
    }
    if (typeof o.vendorId === 'string') {
      out.push({
        kind: 'vendors',
        productId: String(o.productId ?? ''),
        vendorId: o.vendorId,
        vendorName: String(o.vendorName ?? 'Shop'),
        name: String(o.name ?? 'Product'),
        priceCents:
          typeof o.priceCents === 'number' && Number.isFinite(o.priceCents)
            ? Math.round(o.priceCents)
            : typeof o.price === 'number'
              ? Math.round(o.price * 100)
              : 0,
        quantity: typeof o.quantity === 'number' && o.quantity > 0 ? Math.floor(o.quantity) : 1,
        image: typeof o.image === 'string' ? o.image : null,
        thc: typeof o.thc === 'number' ? o.thc : null,
        cbd: typeof o.cbd === 'number' ? o.cbd : null,
      });
    }
  }
  return out;
}

function tryAddVendorsLine(
  prev: CartItem[],
  line: VendorsCartLine
): { result: AddItemResult; next: CartItem[] } {
  if (prev.length === 0) return { result: { ok: true }, next: [line] };
  const first = prev[0];
  if (first.kind === 'legacy') return { result: { ok: false, reason: 'SCHEMA_MIX' }, next: prev };
  if (first.vendorId !== line.vendorId) {
    return {
      result: { ok: false, reason: 'DIFFERENT_VENDOR', currentVendorName: first.vendorName },
      next: prev,
    };
  }
  const existing = prev.find((i) => i.kind === 'vendors' && i.productId === line.productId);
  if (existing && existing.kind === 'vendors') {
    return {
      result: { ok: true },
      next: prev.map((i) =>
        i.kind === 'vendors' && i.productId === line.productId
          ? { ...i, quantity: i.quantity + line.quantity }
          : i
      ),
    };
  }
  return { result: { ok: true }, next: [...prev, line] };
}

function tryAddLegacyLine(
  prev: CartItem[],
  line: LegacyCartLine
): { result: AddItemResult; next: CartItem[] } {
  if (prev.length === 0) return { result: { ok: true }, next: [line] };
  const first = prev[0];
  if (first.kind === 'vendors') return { result: { ok: false, reason: 'SCHEMA_MIX' }, next: prev };
  if (first.serviceId !== line.serviceId) {
    return {
      result: {
        ok: false,
        reason: 'DIFFERENT_SERVICE',
        currentServiceLabel: first.serviceName,
      },
      next: prev,
    };
  }
  const existing = prev.find((i) => i.kind === 'legacy' && i.productId === line.productId);
  if (existing && existing.kind === 'legacy') {
    return {
      result: { ok: true },
      next: prev.map((i) =>
        i.kind === 'legacy' && i.productId === line.productId
          ? { ...i, quantity: i.quantity + line.quantity }
          : i
      ),
    };
  }
  return { result: { ok: true }, next: [...prev, line] };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    try {
      const v3 = localStorage.getItem(STORAGE_KEY);
      if (v3) {
        const parsed = migrateRawToItems(JSON.parse(v3));
        itemsRef.current = parsed;
        setItems(parsed);
        setHydrated(true);
        return;
      }
      const leg = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (leg) {
        const migrated = migrateRawToItems(JSON.parse(leg));
        itemsRef.current = migrated;
        setItems(migrated);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      itemsRef.current = [];
      setItems([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota */
    }
  }, [items, hydrated]);

  const cartKind = useMemo((): CartContextType['cartKind'] => {
    if (items.length === 0) return 'empty';
    return items[0].kind;
  }, [items]);

  const addItem = useCallback(
    (item: Omit<VendorsCartLine, 'kind' | 'quantity'> & { quantity?: number }): AddItemResult => {
      const quantity = item.quantity != null && item.quantity > 0 ? Math.floor(item.quantity) : 1;
      const line: VendorsCartLine = { kind: 'vendors', ...item, quantity };
      const { result, next } = tryAddVendorsLine(itemsRef.current, line);
      itemsRef.current = next;
      setItems(next);
      return result;
    },
    []
  );

  const addLegacyItem = useCallback(
    (item: Omit<LegacyCartLine, 'kind' | 'quantity'> & { quantity?: number }): AddItemResult => {
      const quantity = item.quantity != null && item.quantity > 0 ? Math.floor(item.quantity) : 1;
      const line: LegacyCartLine = { kind: 'legacy', ...item, quantity };
      const { result, next } = tryAddLegacyLine(itemsRef.current, line);
      itemsRef.current = next;
      setItems(next);
      return result;
    },
    []
  );

  const replaceCartWith = useCallback((item: CartItem) => {
    const next = [{ ...item, quantity: item.quantity > 0 ? item.quantity : 1 }];
    itemsRef.current = next;
    setItems(next);
  }, []);

  const removeItem = useCallback((productId: string) => {
    const next = itemsRef.current.filter((i) => i.productId !== productId);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      const next = itemsRef.current.filter((i) => i.productId !== productId);
      itemsRef.current = next;
      setItems(next);
      return;
    }
    const next = itemsRef.current.map((i) =>
      i.productId === productId ? { ...i, quantity } : i
    );
    itemsRef.current = next;
    setItems(next);
  }, []);

  const clearCart = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (item.kind === 'vendors') return sum + (item.priceCents / 100) * item.quantity;
        return sum + item.price * item.quantity;
      }, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      cartKind,
      addItem,
      addLegacyItem,
      replaceCartWith,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
    }),
    [
      items,
      cartKind,
      addItem,
      addLegacyItem,
      replaceCartWith,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
