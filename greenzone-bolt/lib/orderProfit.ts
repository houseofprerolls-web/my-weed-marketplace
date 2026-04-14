/** Normalize `orders.items` jsonb for margin math (supports future snapshots + legacy shapes). */

export type RawOrderItem = Record<string, unknown>;

/** Clone order line items for safe editing (JSON-shaped rows). */
export function cloneOrderItemsForEdit(items: unknown): RawOrderItem[] {
  const arr = orderItemsArray(items);
  try {
    return JSON.parse(JSON.stringify(arr)) as RawOrderItem[];
  } catch {
    return arr.map((x) => ({ ...x }));
  }
}

export function orderItemsArray(items: unknown): RawOrderItem[] {
  if (!items || !Array.isArray(items)) return [];
  return items as RawOrderItem[];
}

function positiveIntFromUnknown(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 0;
}

export function lineQuantity(line: RawOrderItem): number {
  const q = positiveIntFromUnknown(line.qty ?? line.quantity);
  return q > 0 ? q : 1;
}

function centsFromUnknown(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
}

export function lineUnitPriceCents(line: RawOrderItem): number {
  const u = centsFromUnknown(line.unit_price_cents);
  if (u != null && u >= 0) return u;
  const p = centsFromUnknown(line.price_cents);
  if (p != null && p >= 0) return p;
  const rawPrice = line.price;
  if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) {
    return Math.round(rawPrice * 100);
  }
  if (typeof rawPrice === 'string' && rawPrice.trim()) {
    const n = Number(rawPrice);
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  return 0;
}

/** Image URL stored on the order line at checkout (`image`, `image_url`, or first `images[]` entry). */
export function lineSnapshotImageUrl(line: RawOrderItem): string | null {
  const a = line.image;
  if (typeof a === 'string' && a.trim()) return a.trim();
  const b = line.image_url;
  if (typeof b === 'string' && b.trim()) return b.trim();
  const c = line.thumbnail_url;
  if (typeof c === 'string' && c.trim()) return c.trim();
  const arr = line.images;
  if (Array.isArray(arr)) {
    for (const x of arr) {
      if (typeof x === 'string' && x.trim()) return x.trim();
    }
  }
  return null;
}

export function lineUnitCostCents(line: RawOrderItem, costMap: Map<string, number>): number {
  if (typeof line.unit_cost_cents === 'number' && Number.isFinite(line.unit_cost_cents)) {
    return Math.max(0, Math.round(line.unit_cost_cents));
  }
  const pid = typeof line.product_id === 'string' ? line.product_id : null;
  if (pid && costMap.has(pid)) return costMap.get(pid)!;
  return 0;
}

/** Gross profit on catalog items only (excludes tax/shipping in order total). */
export function orderGrossProfitCents(items: unknown, costMap: Map<string, number>): number {
  return orderItemsArray(items).reduce((sum, line) => {
    const q = lineQuantity(line);
    const rev = lineUnitPriceCents(line) * q;
    const cost = lineUnitCostCents(line, costMap) * q;
    return sum + (rev - cost);
  }, 0);
}

export function collectProductIdsFromOrders(itemsList: unknown[]): string[] {
  const ids = new Set<string>();
  for (const items of itemsList) {
    for (const line of orderItemsArray(items)) {
      const pid = line.product_id;
      if (typeof pid === 'string' && pid.length > 0) ids.add(pid);
    }
  }
  return Array.from(ids);
}
