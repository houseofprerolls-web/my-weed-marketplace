'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Loader2, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  collectProductIdsFromOrders,
  lineQuantity,
  lineUnitPriceCents,
  orderItemsArray,
} from '@/lib/orderProfit';

type OrderPt = { created_at: string; total_cents: number; items?: unknown };

type Props = {
  /** Revenue / charts: non-cancelled orders only */
  orders: OrderPt[];
  cancelledOrderCount?: number;
  /** Sum of `total_cents` for canceled orders (“potential” cart value). */
  cancelledOrdersValueCents?: number;
  productCount: number;
  reviewCount: number;
  analyticsEventCount: number | null;
  /** Full retail-style analytics (daily, weekday, hour, category, composed monthly). */
  showDispensarySuite?: boolean;
  /** Compact: only the top sellers table (e.g. dashboard tab). Requires `orders[].items`. */
  showTopSellingProducts?: boolean;
};

const PIE_COLORS = ['#22c55e', '#4ade80', '#86efac', '#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#94a3b8'];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dailyNetSalesSeries(orders: OrderPt[]) {
  if (!orders.length) return [];
  const byDay = new Map<string, number>();
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const o of orders) {
    const k = localYmd(new Date(o.created_at));
    byDay.set(k, (byDay.get(k) || 0) + (o.total_cents || 0));
    const t = new Date(o.created_at).getTime();
    if (!Number.isNaN(t)) {
      minMs = Math.min(minMs, t);
      maxMs = Math.max(maxMs, t);
    }
  }
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return [];
  const start = new Date(minMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(maxMs);
  end.setHours(0, 0, 0, 0);
  const out: { key: string; label: string; revenue: number }[] = [];
  for (let cur = start.getTime(); cur <= end.getTime(); cur += 86400000) {
    const d = new Date(cur);
    const key = localYmd(d);
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue: Math.round((byDay.get(key) || 0) / 100),
    });
  }
  return out;
}

function revenueByWeekday(orders: OrderPt[]) {
  const cents = [0, 0, 0, 0, 0, 0, 0];
  for (const o of orders) {
    const d = new Date(o.created_at);
    if (Number.isNaN(d.getTime())) continue;
    cents[d.getDay()] += o.total_cents || 0;
  }
  // Mon-first for a typical retail week view
  const orderIdx = [1, 2, 3, 4, 5, 6, 0];
  return orderIdx.map((idx) => ({
    label: WEEKDAY_LABELS[idx],
    revenue: Math.round(cents[idx] / 100),
  }));
}

function revenueByHour(orders: OrderPt[]) {
  const cents = new Array(24).fill(0) as number[];
  for (const o of orders) {
    const d = new Date(o.created_at);
    if (Number.isNaN(d.getTime())) continue;
    cents[d.getHours()] += o.total_cents || 0;
  }
  return cents.map((c, h) => ({
    label: `${h}:00`,
    hour: h,
    revenue: Math.round(c / 100),
  }));
}

function categoryLabel(raw: string): string {
  const s = raw.trim() || 'Uncategorized';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function lineSnapshotName(line: Record<string, unknown>): string | null {
  for (const k of ['product_name', 'name', 'title'] as const) {
    const v = line[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function buildTopSellingProducts(
  orders: OrderPt[],
  nameByProductId: Map<string, string>
): { name: string; units: number; revenueCents: number }[] {
  const agg = new Map<string, { name: string; units: number; revenueCents: number }>();

  for (const o of orders) {
    for (const line of orderItemsArray(o.items)) {
      const pid = typeof line.product_id === 'string' ? line.product_id : null;
      const q = lineQuantity(line);
      const cents = lineUnitPriceCents(line) * q;
      if (q <= 0 && cents <= 0) continue;

      const snap = lineSnapshotName(line);
      const key = pid ?? `snap:${(snap || 'unknown').toLowerCase()}`;
      const displayName = pid
        ? (nameByProductId.get(pid) ?? snap ?? `Product ${pid.slice(0, 8)}…`)
        : (snap ?? 'Unknown item');

      const cur = agg.get(key);
      if (cur) {
        cur.units += q;
        cur.revenueCents += cents;
      } else {
        agg.set(key, { name: displayName, units: q, revenueCents: cents });
      }
    }
  }

  return Array.from(agg.values())
    .sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents)
    .slice(0, 15);
}

function buildCategoryPieData(
  orders: OrderPt[],
  productCategory: Map<string, string>
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    for (const line of orderItemsArray(o.items)) {
      const pid = typeof line.product_id === 'string' ? line.product_id : null;
      const cents = lineQuantity(line) * lineUnitPriceCents(line);
      if (cents <= 0) continue;
      let bucket: string;
      if (pid && productCategory.has(pid)) {
        bucket = categoryLabel(productCategory.get(pid)!);
      } else {
        bucket = 'Other / unmapped';
      }
      map.set(bucket, (map.get(bucket) || 0) + cents);
    }
  }
  const rows = Array.from(map.entries())
    .map(([name, c]) => ({ name, value: Math.round((c / 100) * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
  const n = 7;
  if (rows.length <= n) return rows;
  const head = rows.slice(0, n);
  const restSum = rows.slice(n).reduce((s, r) => s + r.value, 0);
  return [...head, { name: `Other (${rows.length - n} categories)`, value: Math.round(restSum * 100) / 100 }];
}

function avgLineItemsPerOrder(orders: OrderPt[]): number {
  if (!orders.length) return 0;
  let lines = 0;
  for (const o of orders) {
    lines += orderItemsArray(o.items).length;
  }
  return Math.round((lines / orders.length) * 10) / 10;
}

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const tooltipBox = {
  backgroundColor: '#111827',
  border: '1px solid #166534',
  borderRadius: 8,
};

function TopSellingProductsCard({
  categoryLoading,
  hasLineItems,
  topSellingProducts,
}: {
  categoryLoading: boolean;
  hasLineItems: boolean;
  topSellingProducts: { name: string; units: number; revenueCents: number }[];
}) {
  return (
    <Card className="border-green-900/20 bg-gray-900/50 p-6">
      <h3 className="mb-1 text-lg font-semibold text-white">Top selling products</h3>
      <p className="mb-4 text-xs text-gray-500">
        By units sold on non-cancelled orders (line items). Names come from your catalog when line items include a
        product id.
      </p>
      {categoryLoading ? (
        <div className="flex h-40 items-center justify-center gap-2 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin text-brand-lime" />
          Loading product names…
        </div>
      ) : !hasLineItems ? (
        <p className="py-10 text-center text-sm text-gray-500">
          No line items on orders yet — this list appears once checkout saves item rows on each order. Older orders may
          have an empty items field in the database.
        </p>
      ) : topSellingProducts.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          No sellable line data found (check quantities and prices on order items).
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/20 hover:bg-transparent">
              <TableHead className="w-12 text-gray-400">#</TableHead>
              <TableHead className="text-gray-300">Product</TableHead>
              <TableHead className="text-right text-gray-300">Units</TableHead>
              <TableHead className="text-right text-gray-300">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topSellingProducts.map((row, i) => (
              <TableRow key={`${row.name}-${row.units}-${row.revenueCents}-${i}`} className="border-green-900/15">
                <TableCell className="text-gray-500">{i + 1}</TableCell>
                <TableCell className="font-medium text-white">{row.name}</TableCell>
                <TableCell className="text-right text-gray-200">{row.units}</TableCell>
                <TableCell className="text-right text-green-400">{formatUsdFromCents(row.revenueCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export function VendorAnalyticsCharts({
  orders,
  cancelledOrderCount = 0,
  cancelledOrdersValueCents = 0,
  productCount,
  reviewCount,
  analyticsEventCount,
  showDispensarySuite = false,
  showTopSellingProducts = false,
}: Props) {
  const [categoryPie, setCategoryPie] = useState<{ name: string; value: number }[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<
    { name: string; units: number; revenueCents: number }[]
  >([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const k = monthKey(o.created_at);
      map.set(k, (map.get(k) || 0) + (o.total_cents || 0));
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => ({
      key: k,
      label: formatMonth(k),
      revenue: Math.round((map.get(k) || 0) / 100),
    }));
  }, [orders]);

  const ordersByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const k = monthKey(o.created_at);
      map.set(k, (map.get(k) || 0) + 1);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => ({
      key: k,
      label: formatMonth(k),
      orders: map.get(k) || 0,
    }));
  }, [orders]);

  const monthlyCombined = useMemo(() => {
    const om = new Map(ordersByMonth.map((r) => [r.key, r.orders]));
    return revenueByMonth.map((r) => ({
      key: r.key,
      label: r.label,
      revenue: r.revenue,
      orders: om.get(r.key) ?? 0,
    }));
  }, [revenueByMonth, ordersByMonth]);

  const dailySeries = useMemo(() => dailyNetSalesSeries(orders), [orders]);
  const weekdaySeries = useMemo(() => revenueByWeekday(orders), [orders]);
  const hourSeries = useMemo(() => revenueByHour(orders), [orders]);

  const totalRev = orders.reduce((s, o) => s + (o.total_cents || 0), 0);
  const aovCents = orders.length ? totalRev / orders.length : 0;
  const avgLines = useMemo(() => avgLineItemsPerOrder(orders), [orders]);

  const hasLineItems = useMemo(
    () => orders.some((o) => orderItemsArray(o.items).length > 0),
    [orders]
  );

  const needsLineItemAnalytics = showDispensarySuite || showTopSellingProducts;

  useEffect(() => {
    if (!needsLineItemAnalytics || !hasLineItems) {
      setCategoryPie([]);
      setTopSellingProducts([]);
      setCategoryLoading(false);
      return;
    }
    let cancelled = false;
    setCategoryLoading(true);
    (async () => {
      const ids = collectProductIdsFromOrders(orders.map((o) => o.items));
      const nameByProductId = new Map<string, string>();
      const productCategory = new Map<string, string>();

      if (ids.length > 0) {
        const { data, error } = await supabase.from('products').select('id,category,name').in('id', ids);
        if (cancelled) return;
        if (error) {
          console.error(error);
          setCategoryPie([]);
          setTopSellingProducts([]);
          setCategoryLoading(false);
          return;
        }
        for (const row of (data || []) as { id: string; category: string | null; name: string | null }[]) {
          nameByProductId.set(row.id, (row.name && row.name.trim()) || 'Unnamed product');
          productCategory.set(row.id, row.category || 'other');
        }
      }

      if (cancelled) return;
      if (showDispensarySuite) {
        setCategoryPie(buildCategoryPieData(orders, productCategory));
      } else {
        setCategoryPie([]);
      }
      setTopSellingProducts(buildTopSellingProducts(orders, nameByProductId));
      setCategoryLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orders, needsLineItemAnalytics, hasLineItems, showDispensarySuite]);

  const chartTooltip = (
    <Tooltip contentStyle={tooltipBox} labelStyle={{ color: '#e5e7eb' }} />
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <DollarSign className="h-4 w-4 text-green-500" />
            Revenue (excl. cancelled)
          </div>
          <p className="text-3xl font-bold text-white">${(totalRev / 100).toFixed(2)}</p>
          <p className="mt-2 text-xs text-gray-500">Cancelled orders are omitted from this total and from charts below.</p>
        </Card>
        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <ShoppingBag className="h-4 w-4 text-blue-500" />
            Order volume (excl. cancelled)
          </div>
          <p className="text-3xl font-bold text-white">{orders.length}</p>
          <p className="mt-2 text-xs text-gray-500">Completed, in progress, and other non-cancelled orders.</p>
        </Card>
        <Card className="border-red-900/20 bg-gradient-to-br from-red-950/40 to-black p-6">
          <div className="mb-2 text-sm text-gray-400">Potential / cancelled</div>
          <p className="text-3xl font-bold text-red-200">{cancelledOrderCount}</p>
          <p className="mt-2 text-sm text-gray-400">
            Orders received then cancelled
            {cancelledOrdersValueCents > 0 && (
              <>
                {' '}
                · <span className="text-red-300">${(cancelledOrdersValueCents / 100).toFixed(2)}</span> at order totals
              </>
            )}
          </p>
        </Card>
        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <p className="mb-2 text-sm text-gray-400">Catalog & reputation</p>
          <p className="text-lg text-white">
            <span className="font-bold">{productCount}</span> products ·{' '}
            <span className="font-bold">{reviewCount}</span> reviews
          </p>
          {analyticsEventCount != null && (
            <p className="mt-2 text-sm text-gray-500">{analyticsEventCount} tracked events</p>
          )}
        </Card>
      </div>

      {showDispensarySuite && orders.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
            <p className="mb-2 text-sm text-gray-400">Average order value</p>
            <p className="text-3xl font-bold text-white">${(aovCents / 100).toFixed(2)}</p>
            <p className="mt-2 text-xs text-gray-500">Mean ticket on non-cancelled orders.</p>
          </Card>
          <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
            <p className="mb-2 text-sm text-gray-400">Avg line items / order</p>
            <p className="text-3xl font-bold text-white">{avgLines}</p>
            <p className="mt-2 text-xs text-gray-500">From stored order line items when present.</p>
          </Card>
        </div>
      )}

      {revenueByMonth.length === 0 ? (
        <Card className="border-green-900/20 bg-gray-900/50 p-10 text-center text-gray-400">
          No order history yet — charts will fill in as orders come in.
        </Card>
      ) : (
        <>
          {showDispensarySuite ? (
            <>
              <Card className="border-green-900/20 bg-gray-900/50 p-6">
                <h3 className="mb-1 text-lg font-semibold text-white">Monthly performance</h3>
                <p className="mb-4 text-xs text-gray-500">Net revenue (area) and order count (bars), non-cancelled only.</p>
                <div className="h-72 w-full min-h-[280px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyCombined} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revFillComposed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                      <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis
                        yAxisId="left"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        allowDecimals={false}
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={tooltipBox}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value: number, name: string) =>
                          name === 'revenue' ? [`$${value}`, 'Revenue'] : [value, 'Orders']
                        }
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4ade80"
                        strokeWidth={2}
                        fill="url(#revFillComposed)"
                      />
                      <Bar yAxisId="right" dataKey="orders" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <TopSellingProductsCard
                categoryLoading={categoryLoading}
                hasLineItems={hasLineItems}
                topSellingProducts={topSellingProducts}
              />
            </>
          ) : (
            <>
              <Card className="border-green-900/20 bg-gray-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Revenue by month</h3>
                <div className="h-64 w-full min-h-[240px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                      <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={tooltipBox}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value: number) => [`$${value}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#4ade80" fill="url(#revFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border-green-900/20 bg-gray-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Orders by month</h3>
                <div className="h-56 w-full min-h-[220px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                      <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      {chartTooltip}
                      <Bar dataKey="orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {showTopSellingProducts && (
                <TopSellingProductsCard
                  categoryLoading={categoryLoading}
                  hasLineItems={hasLineItems}
                  topSellingProducts={topSellingProducts}
                />
              )}
            </>
          )}

          {showDispensarySuite && (
            <>
              <Card className="border-green-900/20 bg-gray-900/50 p-6">
                <h3 className="mb-1 text-lg font-semibold text-white">Daily net sales</h3>
                <p className="mb-4 text-xs text-gray-500">Local calendar days, order totals in dollars.</p>
                <div className="h-64 w-full min-h-[240px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                      <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={tooltipBox}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value: number) => [`$${value}`, 'Net sales']}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#4ade80" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-green-900/20 bg-gray-900/50 p-6">
                  <h3 className="mb-1 text-lg font-semibold text-white">Sales by weekday</h3>
                  <p className="mb-4 text-xs text-gray-500">Week starts Monday.</p>
                  <div className="h-56 w-full min-h-[220px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdaySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                        <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={tooltipBox}
                          labelStyle={{ color: '#e5e7eb' }}
                          formatter={(value: number) => [`$${value}`, 'Revenue']}
                        />
                        <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="border-green-900/20 bg-gray-900/50 p-6">
                  <h3 className="mb-1 text-lg font-semibold text-white">Sales by hour of day</h3>
                  <p className="mb-4 text-xs text-gray-500">Based on order timestamp in your local timezone.</p>
                  <div className="h-56 w-full min-h-[220px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                        <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 9 }} interval={2} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={tooltipBox}
                          labelStyle={{ color: '#e5e7eb' }}
                          formatter={(value: number) => [`$${value}`, 'Revenue']}
                        />
                        <Bar dataKey="revenue" fill="#818cf8" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card className="border-green-900/20 bg-gray-900/50 p-6">
                <h3 className="mb-1 text-lg font-semibold text-white">Revenue by product category</h3>
                <p className="mb-4 text-xs text-gray-500">Line-level totals from order items × catalog category (top slices grouped).</p>
                {categoryLoading ? (
                  <div className="flex h-64 items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-lime" />
                    Loading categories…
                  </div>
                ) : !hasLineItems ? (
                  <p className="py-12 text-center text-sm text-gray-500">
                    No line items on orders yet — category mix will appear once checkout stores item rows.
                  </p>
                ) : categoryPie.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">
                    Could not attribute revenue to categories (check product links on line items).
                  </p>
                ) : (
                  <div className="h-72 w-full min-h-[280px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={56}
                          outerRadius={96}
                          paddingAngle={2}
                        >
                          {categoryPie.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ color: '#d1d5db', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={tooltipBox}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
