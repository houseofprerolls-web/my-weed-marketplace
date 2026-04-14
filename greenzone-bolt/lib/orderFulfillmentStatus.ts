/** Matches `0049_orders_fulfillment_statuses_and_notifications.sql` + legacy values until migrated. */

export const ORDER_FULFILLMENT_FLOW = [
  'pending',
  'accepted',
  'en_route',
  'completed',
] as const;

export type OrderFulfillmentStatus = (typeof ORDER_FULFILLMENT_FLOW)[number] | 'cancelled';

const LEGACY_MAP: Record<string, OrderFulfillmentStatus> = {
  confirmed: 'accepted',
  fulfilled: 'completed',
  preparing: 'accepted',
  processing: 'accepted',
  out_for_delivery: 'en_route',
  delivered: 'completed',
  new: 'pending',
  received: 'pending',
};

export function normalizeOrderStatus(raw: string): string {
  const key = raw.trim().toLowerCase();
  const mapped = LEGACY_MAP[key];
  if (mapped) return mapped;
  if (key === 'cancelled') return 'cancelled';
  if ((ORDER_FULFILLMENT_FLOW as readonly string[]).includes(key)) return key;
  return raw.trim();
}

export function orderStatusLabel(raw: string): string {
  const s = normalizeOrderStatus(raw);
  switch (s) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'en_route':
      return 'En route';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return s;
  }
}

/** Next step in the happy path, or null if terminal / cancelled. */
export function nextFulfillmentStatus(current: string): OrderFulfillmentStatus | null {
  const s = normalizeOrderStatus(current);
  const i = (ORDER_FULFILLMENT_FLOW as readonly string[]).indexOf(s);
  if (i < 0 || s === 'cancelled') return null;
  if (i >= ORDER_FULFILLMENT_FLOW.length - 1) return null;
  return ORDER_FULFILLMENT_FLOW[i + 1];
}

export function canVendorCancelStatus(current: string): boolean {
  const s = normalizeOrderStatus(current);
  return s === 'pending' || s === 'accepted' || s === 'en_route';
}

/** Vendor may use one-shot complete (skip intermediate fulfillment steps). */
export function canVendorMarkCompleteNow(raw: string): boolean {
  const s = normalizeOrderStatus(raw);
  return s === 'pending' || s === 'accepted' || s === 'en_route';
}

/** Customer may cancel until the order is completed (see `0056_customer_cancel_before_complete.sql`). */
export function canCustomerCancelOrder(raw: string): boolean {
  const s = normalizeOrderStatus(raw);
  return s === 'pending' || s === 'accepted' || s === 'en_route';
}
