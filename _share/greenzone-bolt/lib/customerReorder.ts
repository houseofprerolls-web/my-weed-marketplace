import { supabase } from '@/lib/supabase';
import type { AddItemResult, CartItem, VendorsCartLine } from '@/contexts/CartContext';
import { normalizeOrderStatus } from '@/lib/orderFulfillmentStatus';

export const REORDER_SESSION_KEY = 'gz_reorder_notice';

/** Reorder is offered for finished hub orders only. */
export function isPastOrderReorderable(status: string): boolean {
  return normalizeOrderStatus(status) === 'completed';
}

export type ReorderResolveLine = {
  product_id: string;
  vendor_id: string;
  vendor_name: string;
  name: string;
  price_cents: number;
  image: string | null;
  thc: number | null;
  cbd: number | null;
  quantity: number;
};

export type ReorderSkipped = { label: string; reason: 'out_of_stock' | 'not_on_menu' };

export type ReorderResolveOk = {
  ok: true;
  vendor_id: string;
  vendor_name: string;
  lines: ReorderResolveLine[];
  skipped: ReorderSkipped[];
};

export type ReorderResolveErr = {
  ok: false;
  code: string;
  message: string;
  vendor_name?: string;
};

function parseLine(raw: unknown): ReorderResolveLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const product_id = typeof o.product_id === 'string' ? o.product_id : null;
  const vendor_id = typeof o.vendor_id === 'string' ? o.vendor_id : null;
  const vendor_name = typeof o.vendor_name === 'string' ? o.vendor_name : '';
  const name = typeof o.name === 'string' ? o.name : 'Product';
  const price_cents =
    typeof o.price_cents === 'number' && Number.isFinite(o.price_cents) ? Math.round(o.price_cents) : 0;
  const image = typeof o.image === 'string' ? o.image : null;
  const thc = typeof o.thc === 'number' ? o.thc : null;
  const cbd = typeof o.cbd === 'number' ? o.cbd : null;
  const quantity =
    typeof o.quantity === 'number' && o.quantity > 0 ? Math.floor(o.quantity) : 1;
  if (!product_id || !vendor_id) return null;
  return { product_id, vendor_id, vendor_name, name, price_cents, image, thc, cbd, quantity };
}

function parseSkipped(raw: unknown): ReorderSkipped | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label : 'Item';
  const reason = o.reason === 'out_of_stock' || o.reason === 'not_on_menu' ? o.reason : 'not_on_menu';
  return { label, reason };
}

export async function fetchReorderPayload(orderId: string): Promise<ReorderResolveOk | ReorderResolveErr> {
  const { data, error } = await supabase.rpc('customer_reorder_resolve', { p_order_id: orderId });
  if (error) {
    return { ok: false, code: 'RPC_ERROR', message: error.message };
  }
  const row = data as Record<string, unknown> | null;
  if (!row || typeof row !== 'object') {
    return { ok: false, code: 'UNKNOWN', message: 'Unexpected response from server.' };
  }
  if (row.ok === false) {
    return {
      ok: false,
      code: String(row.code ?? 'ERROR'),
      message: String(row.message ?? 'Unable to reorder.'),
      vendor_name: typeof row.vendor_name === 'string' ? row.vendor_name : undefined,
    };
  }
  const linesIn = Array.isArray(row.lines) ? row.lines : [];
  const skippedIn = Array.isArray(row.skipped) ? row.skipped : [];
  const lines = linesIn.map(parseLine).filter(Boolean) as ReorderResolveLine[];
  const skipped = skippedIn.map(parseSkipped).filter(Boolean) as ReorderSkipped[];
  const vendor_id = typeof row.vendor_id === 'string' ? row.vendor_id : '';
  const vendor_name = typeof row.vendor_name === 'string' ? row.vendor_name : '';
  if (!vendor_id) {
    return { ok: false, code: 'INVALID', message: 'Missing vendor for this order.' };
  }
  return { ok: true, vendor_id, vendor_name, lines, skipped };
}

export function skippedToNoticeLines(skipped: ReorderSkipped[]): string[] {
  return skipped.map((s) =>
    s.reason === 'out_of_stock' ? `${s.label} (out of stock)` : `${s.label} (not on menu)`
  );
}

export type ReorderNoticePayload = {
  vendorId: string;
  unavailable: string[];
  addedCount: number;
};

export function stashReorderNotice(payload: ReorderNoticePayload): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(REORDER_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export async function runCustomerReorderFlow(
  orderId: string,
  cart: CartOps
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const res = await fetchReorderPayload(orderId);
  if (!res.ok) {
    return { ok: false, message: res.message };
  }
  if (!applyReorderLinesToCart(res, cart)) {
    return { ok: false, message: 'Cart was not changed.' };
  }
  stashReorderNotice({
    vendorId: res.vendor_id,
    unavailable: skippedToNoticeLines(res.skipped),
    addedCount: res.lines.length,
  });
  return { ok: true, path: `/listing/${res.vendor_id}` };
}

export type CartOps = {
  cartKind: 'empty' | 'vendors' | 'legacy';
  items: CartItem[];
  replaceCartWith: (item: CartItem) => void;
  addItem: (item: Omit<VendorsCartLine, 'kind' | 'quantity'> & { quantity?: number }) => AddItemResult;
};

/**
 * Replaces the cart with reorder lines (vendors schema). Returns false if the user declines a replace prompt.
 */
export function applyReorderLinesToCart(payload: ReorderResolveOk, cart: CartOps): boolean {
  if (payload.lines.length === 0) {
    return true;
  }
  const targetVendorId = payload.vendor_id;
  const targetVendorName = payload.vendor_name;

  const base = (ln: ReorderResolveLine): Omit<VendorsCartLine, 'kind'> => ({
    vendorId: ln.vendor_id,
    vendorName: ln.vendor_name,
    productId: ln.product_id,
    name: ln.name,
    priceCents: ln.price_cents,
    image: ln.image,
    thc: ln.thc,
    cbd: ln.cbd,
    quantity: ln.quantity,
  });

  if (cart.cartKind !== 'empty' && typeof window !== 'undefined') {
    const firstItem = cart.items[0];
    if (firstItem?.kind === 'legacy') {
      if (!window.confirm('Replace your current cart with items from this past order?')) return false;
    } else if (firstItem?.kind === 'vendors' && firstItem.vendorId !== targetVendorId) {
      if (
        !window.confirm(
          `Your cart has items from ${firstItem.vendorName}. Replace with ${targetVendorName}?`
        )
      ) {
        return false;
      }
    }
  }

  const [first, ...rest] = payload.lines;
  cart.replaceCartWith({
    kind: 'vendors',
    ...base(first!),
    quantity: first!.quantity,
  });
  for (const ln of rest) {
    cart.addItem(base(ln));
  }
  return true;
}
