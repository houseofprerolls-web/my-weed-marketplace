'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarRange } from 'lucide-react';
import { normalizeOrderStatus, orderStatusLabel } from '@/lib/orderFulfillmentStatus';

export type ExplorerOrderRow = {
  id: string;
  order_number?: string | null;
  status: string;
  created_at: string;
  total_cents: number;
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  orders: ExplorerOrderRow[];
  /** Earliest calendar day selectable (e.g. first linked store `created_at`). */
  storeStartYmd: string;
  /**
   * Build order detail URLs (e.g. pass `(id) => withAdminVendorQuery(\`/vendor/orders/${id}\`, vendorUuid)` so admins
   * keep `?vendor=` when acting as a shop).
   */
  getOrderHref?: (orderId: string) => string;
};

export function VendorOrderHistoryExplorer({ orders, storeStartYmd, getOrderHref }: Props) {
  const hrefForOrder = getOrderHref ?? ((oid: string) => `/vendor/orders/${oid}`);
  const todayYmd = useMemo(() => toYmd(new Date()), []);
  const [mode, setMode] = useState<'cancelled' | 'completed'>('cancelled');
  const [fromYmd, setFromYmd] = useState(storeStartYmd);
  const [untilYmd, setUntilYmd] = useState(todayYmd);

  useEffect(() => {
    setFromYmd((prev) => (prev < storeStartYmd ? storeStartYmd : prev));
  }, [storeStartYmd]);

  const filtered = useMemo(() => {
    const start = new Date(fromYmd + 'T00:00:00').getTime();
    const end = new Date(untilYmd + 'T23:59:59.999').getTime();
    return orders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      if (Number.isNaN(t) || t < start || t > end) return false;
      const s = normalizeOrderStatus(o.status);
      if (mode === 'cancelled') return s === 'cancelled';
      return s === 'completed';
    });
  }, [orders, fromYmd, untilYmd, mode]);

  const byDay = useMemo(() => {
    const map = new Map<string, ExplorerOrderRow[]>();
    for (const o of filtered) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((k) => ({ day: k, rows: map.get(k)! }));
  }, [filtered]);

  const minBound = storeStartYmd <= todayYmd ? storeStartYmd : todayYmd;

  return (
    <Card className="border-green-900/20 bg-gray-900/50 p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarRange className="h-5 w-5 text-green-500" />
          Orders by day
        </h3>
        <p className="text-xs text-gray-500">
          Range starts from when your store record was created (all linked locations). Adjust dates to compare cancelled
          vs completed volume.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'cancelled' ? 'default' : 'outline'}
          className={mode === 'cancelled' ? 'bg-red-900/60 hover:bg-red-900/80' : 'border-gray-600 text-gray-300'}
          onClick={() => setMode('cancelled')}
        >
          Cancelled ({orders.filter((o) => normalizeOrderStatus(o.status) === 'cancelled').length} all-time)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'completed' ? 'default' : 'outline'}
          className={mode === 'completed' ? 'bg-green-700 hover:bg-green-600' : 'border-gray-600 text-gray-300'}
          onClick={() => setMode('completed')}
        >
          Completed ({orders.filter((o) => normalizeOrderStatus(o.status) === 'completed').length} all-time)
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-gray-400">From</Label>
          <Input
            type="date"
            value={fromYmd}
            min={minBound}
            max={untilYmd}
            onChange={(e) => setFromYmd(e.target.value)}
            className="mt-1 border-green-900/30 bg-gray-950 text-white"
          />
        </div>
        <div>
          <Label className="text-gray-400">To</Label>
          <Input
            type="date"
            value={untilYmd}
            min={fromYmd}
            max={todayYmd}
            onChange={(e) => setUntilYmd(e.target.value)}
            className="mt-1 border-green-900/30 bg-gray-950 text-white"
          />
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        <span className="font-medium text-gray-200">{filtered.length}</span>{' '}
        {mode === 'cancelled' ? 'cancelled' : 'completed'} in range ·{' '}
        <span className="text-green-400">
          ${(filtered.reduce((s, o) => s + (o.total_cents || 0), 0) / 100).toFixed(2)}
        </span>{' '}
        total at order value
      </p>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No orders in this range.</p>
      ) : (
        <div className="max-h-[420px] space-y-6 overflow-y-auto pr-1">
          {byDay.map(({ day, rows }) => (
            <div key={day}>
              <p className="mb-2 border-b border-gray-800 pb-1 text-sm font-medium text-green-400/90">
                {new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · {rows.length} order{rows.length !== 1 ? 's' : ''}
              </p>
              <ul className="space-y-2">
                {rows.map((o) => (
                  <li key={o.id}>
                    <Link href={hrefForOrder(o.id)}>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2 transition hover:border-green-700/40">
                        <div>
                          <p className="font-mono text-sm text-white">
                            {o.order_number?.trim() || `…${o.id.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleTimeString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-gray-600 text-gray-300">
                            {orderStatusLabel(o.status)}
                          </Badge>
                          <span className="text-sm font-medium text-green-400">
                            ${((o.total_cents || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
