'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { VendorOrderHistoryExplorer, type ExplorerOrderRow } from '@/components/vendor/VendorOrderHistoryExplorer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Phone,
  MapPin,
  Globe,
  Plus,
  CreditCard as Edit,
  ChartBar as BarChart3,
  Award,
  Loader2,
  ShoppingBag,
  Truck,
  Link2,
  Sparkles,
  Clock,
  Megaphone,
  CircleAlert as AlertCircle,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import VendorNav from '@/components/vendor/VendorNav';
import { VendorDemoDashboardPreview } from '@/components/vendor/VendorDemoDashboardPreview';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { useVendorAnalyticsScope } from '@/hooks/useVendorAnalyticsScope';
import { collectProductIdsFromOrders, orderGrossProfitCents } from '@/lib/orderProfit';
import { normalizeOrderStatus, orderStatusLabel } from '@/lib/orderFulfillmentStatus';
import { VendorAnalyticsCharts } from '@/components/vendor/VendorAnalyticsCharts';
import { VendorReviewsManager } from '@/components/vendor/VendorReviewsManager';
import { VendorBusinessHoursPanel } from '@/components/vendor/VendorBusinessHoursPanel';
import { isSupplyExchangeEnabled } from '@/lib/supplyExchange';

type DealRow = { id: string; title: string; discount_percent: number; start_date: string; end_date: string };
type ReviewRow = { id: string; rating: number; title: string; body: string | null; created_at: string };
type VendorOrderPreview = { id: string; status: string; created_at: string; total_cents: number };

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function VendorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { isVendor, isAdmin } = useRole();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const {
    vendor,
    ownedVendors,
    loading: vLoading,
    vendorsMode,
    refresh,
    mayEnterVendorShell,
    isAdminManagingOtherVendor,
    hasAccessibleVendor,
  } = useVendorBusiness({ adminMenuVendorId });

  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);

  const {
    analyticsScope,
    setAnalyticsScope,
    effectiveVendorIds,
    resolvedVendor,
    dashboardTitle,
    analyticsSubtitle,
    showScopePicker,
  } = useVendorAnalyticsScope(vendor, ownedVendors);

  const [loadingStats, setLoadingStats] = useState(true);
  const [revenueCents, setRevenueCents] = useState(0);
  const [profitCents, setProfitCents] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [analyticsEvents, setAnalyticsEvents] = useState<number | null>(null);
  const [chartOrders, setChartOrders] = useState<
    { created_at: string; total_cents: number; items?: unknown }[]
  >([]);
  const [ordersPreview, setOrdersPreview] = useState<VendorOrderPreview[]>([]);
  const [allOrderRows, setAllOrderRows] = useState<ExplorerOrderRow[]>([]);
  const [cancelledOrderCount, setCancelledOrderCount] = useState(0);
  const [cancelledOrdersValueCents, setCancelledOrdersValueCents] = useState(0);
  const [dashTab, setDashTab] = useState('overview');
  const [exportingMenuCsv, setExportingMenuCsv] = useState(false);
  const [billingNotice, setBillingNotice] = useState<Record<string, unknown> | null>(null);
  const [supplyRfqTotal, setSupplyRfqTotal] = useState<number | null>(null);
  const [supplyRfqOpen, setSupplyRfqOpen] = useState<number | null>(null);
  const [supplyB2bLoading, setSupplyB2bLoading] = useState(false);

  const effectiveVendorIdForBilling = (resolvedVendor ?? vendor)?.id ?? '';

  useEffect(() => {
    if (!effectiveVendorIdForBilling) {
      setBillingNotice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc('vendor_platform_billing_notice', {
        p_vendor_id: effectiveVendorIdForBilling,
      });
      if (cancelled) return;
      if (error) {
        setBillingNotice(null);
        return;
      }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setBillingNotice(data as Record<string, unknown>);
      } else {
        setBillingNotice(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveVendorIdForBilling]);

  useEffect(() => {
    if (!isSupplyExchangeEnabled() || !vendor?.id) {
      setSupplyRfqTotal(null);
      setSupplyRfqOpen(null);
      setSupplyB2bLoading(false);
      return;
    }
    let cancelled = false;
    setSupplyB2bLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('b2b_rfq_requests')
        .select('id,status')
        .eq('buyer_vendor_id', vendor.id);
      if (cancelled) return;
      if (error || !data) {
        setSupplyRfqTotal(null);
        setSupplyRfqOpen(null);
      } else {
        setSupplyRfqTotal(data.length);
        setSupplyRfqOpen(
          (data as { status: string }[]).filter((r) => ['submitted', 'in_review', 'quoted'].includes(r.status)).length
        );
      }
      setSupplyB2bLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendor?.id]);

  const storeStartYmd = useMemo(() => {
    const times = ownedVendors
      .map((v) => (v.created_at ? new Date(v.created_at).getTime() : NaN))
      .filter((t) => !Number.isNaN(t));
    const d = times.length ? new Date(Math.min(...times)) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [ownedVendors]);

  const loadStats = useCallback(async () => {
    const vendorIds = effectiveVendorIds.filter(Boolean);
    if (!vendorIds.length || !vendorsMode) {
      setOrdersPreview([]);
      setAllOrderRows([]);
      setChartOrders([]);
      setCancelledOrderCount(0);
      setCancelledOrdersValueCents(0);
      setOrderCount(0);
      setRevenueCents(0);
      setProfitCents(0);
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);

    const productsQ =
      vendorIds.length === 1
        ? supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorIds[0]!)
        : supabase.from('products').select('id', { count: 'exact', head: true }).in('vendor_id', vendorIds);

    const dealsQ = supabase
      .from('deals')
      .select('id,title,discount_percent,start_date,end_date')
      .in('vendor_id', vendorIds)
      .order('created_at', { ascending: false })
      .limit(12);

    const reviewsQ = supabase
      .from('reviews')
      .select('id,rating,title,body,created_at')
      .eq('entity_type', 'vendor')
      .in('entity_id', vendorIds)
      .lte('created_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(15);

    const [{ data: orders }, { count: pc }, { data: dealsData }, { data: revs }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_cents, items, created_at, status')
        .in('vendor_id', vendorIds)
        .order('created_at', { ascending: false }),
      productsQ,
      dealsQ,
      reviewsQ,
    ]);

    const orderRows = (orders || []) as {
      id: string;
      order_number: string | null;
      total_cents: number;
      items: unknown;
      created_at: string;
      status: string;
    }[];

    const explorerRows: ExplorerOrderRow[] = orderRows.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      created_at: o.created_at,
      total_cents: o.total_cents || 0,
    }));
    setAllOrderRows(explorerRows);

    const nonCancelled = orderRows.filter((o) => normalizeOrderStatus(o.status) !== 'cancelled');
    const cancelled = orderRows.filter((o) => normalizeOrderStatus(o.status) === 'cancelled');
    setCancelledOrderCount(cancelled.length);
    setCancelledOrdersValueCents(cancelled.reduce((s, o) => s + (o.total_cents || 0), 0));

    setChartOrders(
      nonCancelled.map((o) => ({
        created_at: o.created_at,
        total_cents: o.total_cents || 0,
        items: o.items,
      }))
    );
    setOrdersPreview(
      orderRows.slice(0, 12).map((o) => ({
        id: o.id,
        status: o.status,
        created_at: o.created_at,
        total_cents: o.total_cents || 0,
      }))
    );
    setOrderCount(nonCancelled.length);
    const rev = nonCancelled.reduce((s, o) => s + (o.total_cents || 0), 0);
    setRevenueCents(rev);

    const allIds = collectProductIdsFromOrders(nonCancelled.map((o) => o.items));
    let costMap = new Map<string, number>();
    if (allIds.length) {
      const { data: costs } = await supabase
        .from('product_unit_costs')
        .select('product_id, unit_cost_cents')
        .in('product_id', allIds);
      for (const r of (costs || []) as { product_id: string; unit_cost_cents: number }[]) {
        costMap.set(r.product_id, r.unit_cost_cents);
      }
    }
    const pSum = nonCancelled.reduce((s, o) => s + orderGrossProfitCents(o.items, costMap), 0);
    setProfitCents(pSum);

    setProductCount(pc ?? 0);
    setDeals((dealsData || []) as DealRow[]);
    const rlist = (revs || []) as ReviewRow[];
    setReviews(rlist);
    if (rlist.length) {
      const ar = rlist.reduce((a, b) => a + b.rating, 0) / rlist.length;
      setAvgRating(Math.round(ar * 10) / 10);
    } else {
      setAvgRating(null);
    }

    const ev =
      vendorIds.length === 1
        ? await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendorIds[0]!)
        : await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .in('vendor_id', vendorIds);
    if (!ev.error && typeof ev.count === 'number') {
      setAnalyticsEvents(ev.count);
    } else {
      setAnalyticsEvents(null);
    }

    setLoadingStats(false);
  }, [vendorsMode, effectiveVendorIds]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const fulfillmentCounts = useMemo(() => {
    const m = { pending: 0, accepted: 0, en_route: 0, completed: 0, cancelled: 0, other: 0 };
    for (const o of allOrderRows) {
      const s = normalizeOrderStatus(o.status);
      if (s === 'pending') m.pending += 1;
      else if (s === 'accepted') m.accepted += 1;
      else if (s === 'en_route') m.en_route += 1;
      else if (s === 'completed') m.completed += 1;
      else if (s === 'cancelled') m.cancelled += 1;
      else m.other += 1;
    }
    return m;
  }, [allOrderRows]);

  const exportMenuRecoveryCsv = useCallback(async () => {
    if (!effectiveVendorIds.length) return;
    setExportingMenuCsv(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id,vendor_id,name,category,price_cents,potency_thc,potency_cbd,description,in_stock,images,catalog_product_id,created_at,updated_at'
        )
        .in('vendor_id', effectiveVendorIds)
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const rows = (data || []) as Array<Record<string, unknown>>;
      const header = [
        'id',
        'vendor_id',
        'name',
        'category',
        'price_cents',
        'potency_thc',
        'potency_cbd',
        'description',
        'in_stock',
        'images',
        'catalog_product_id',
        'created_at',
        'updated_at',
      ];
      const lines = [header.join(',')];
      for (const r of rows) {
        const line = [
          r.id,
          r.vendor_id,
          r.name,
          r.category,
          r.price_cents,
          r.potency_thc,
          r.potency_cbd,
          r.description,
          r.in_stock,
          Array.isArray(r.images) ? JSON.stringify(r.images) : r.images,
          r.catalog_product_id,
          r.created_at,
          r.updated_at,
        ]
          .map(csvEscape)
          .join(',');
        lines.push(line);
      }

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `menu-recovery-backup-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportingMenuCsv(false);
    }
  }, [effectiveVendorIds]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          <p className="text-white">You need a linked dispensary to open the vendor dashboard.</p>
          <p className="mt-2 text-sm text-gray-400">
            Sign in with the account that owns your store (e.g. Saferock for the master QA user), or apply under List
            your business.
          </p>
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          Dashboard data requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  const showVendorPreview =
    isVendor && !isAdmin && !isAdminManagingOtherVendor && !hasAccessibleVendor;

  if (showVendorPreview) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold">Vendor dashboard</h1>
            <p className="mt-2 text-gray-400">Preview — connect your store to see live data.</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="md:col-span-1">
              <VendorNav />
            </div>
            <div className="min-w-0 md:col-span-3">
              <VendorDemoDashboardPreview />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold">Vendor dashboard</h1>
            <p className="mt-2 text-gray-400">No dispensary is linked to your login.</p>
            <p className="mt-2 text-sm text-gray-500">
              Run migrations (e.g. 0043–0046, 0145) and sign in as the store owner. Demo storefront slug{' '}
              <code className="text-green-400">house-of-prerolls</code> (House of Prerolls) when seeded.
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <VendorNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-950/40">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-green-500">{vendor.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{dashboardTitle}</h1>
                {(resolvedVendor ?? vendor).verified && (
                  <Badge className="border-green-600/30 bg-green-600/20 text-green-500">Verified</Badge>
                )}
                <Badge className="border-purple-600/30 bg-purple-600/20 text-purple-500">
                  {(resolvedVendor ?? vendor).is_live ? 'Live' : 'Not live'}
                </Badge>
              </div>
              <p className="text-gray-300">{analyticsSubtitle}</p>
              <p className="mt-1 text-sm text-gray-500">
                Listing slug /{(resolvedVendor ?? vendor).slug}
              </p>
              {showScopePicker ? (
                <div className="mt-4 max-w-md space-y-2">
                  <Label htmlFor="dash-analytics-scope" className="text-gray-400">
                    Analytics &amp; orders scope
                  </Label>
                  <Select value={analyticsScope} onValueChange={(v) => setAnalyticsScope(v as 'all' | string)}>
                    <SelectTrigger
                      id="dash-analytics-scope"
                      className="border-green-900/40 bg-gray-950 text-white"
                    >
                      <SelectValue placeholder="Choose location" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(70vh,28rem)] min-w-[max(var(--radix-select-trigger-width),16rem)] border-green-900/30 bg-gray-950 text-white sm:min-w-[20rem]">
                      <SelectItem value="all" textValue="All linked locations (combined)" className="items-start py-2">
                        All linked locations (combined)
                      </SelectItem>
                      {ownedVendors.map((v) => {
                        const loc = [v.city, v.state].filter(Boolean).join(', ') || v.zip || 'Area TBD';
                        return (
                          <SelectItem key={v.id} value={v.id} textValue={v.name} className="items-start py-2">
                            <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                              <span className="font-medium">{v.name}</span>
                              <span className="text-[11px] text-gray-400">{loc}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Charts, order totals, deals, and reviews follow this scope. Switch to see one shop only.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>

          <div className="min-w-0 space-y-6 md:col-span-3">
            {isAdminManagingOtherVendor ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/95">
                <span className="font-semibold text-amber-200">Admin mode:</span> you are viewing{' '}
                <span className="font-medium text-white">{vendor.name}</span>’s dashboard (not your own store).
              </div>
            ) : null}
            {billingNotice &&
            (billingNotice.notice_kind === 'overdue' ||
              billingNotice.notice_kind === 'due_soon' ||
              billingNotice.billing_suspended === true) ? (
              <Card
                className={
                  billingNotice.notice_kind === 'overdue' || billingNotice.billing_suspended === true
                    ? 'border-red-500/50 bg-red-950/30 p-4'
                    : 'border-amber-500/40 bg-amber-950/25 p-4'
                }
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <AlertCircle
                      className={
                        billingNotice.notice_kind === 'overdue' || billingNotice.billing_suspended === true
                          ? 'mt-0.5 h-5 w-5 shrink-0 text-red-400'
                          : 'mt-0.5 h-5 w-5 shrink-0 text-amber-400'
                      }
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {billingNotice.notice_kind === 'overdue' || billingNotice.billing_suspended === true
                          ? 'Platform invoice overdue'
                          : 'Platform invoice due soon'}
                      </p>
                      <p className="mt-1 text-sm text-gray-300">
                        {billingNotice.notice_kind === 'overdue' || billingNotice.billing_suspended === true ? (
                          billingNotice.billing_suspended === true ? (
                            <>
                              Your public storefront is currently hidden from discovery and the public menu because a
                              platform invoice is overdue. Unpaid billing puts your listing at risk of staying
                              disconnected until our team records payment — contact us if you already submitted
                              payment.
                            </>
                          ) : (
                            <>
                              Your platform invoice is past due. Your store may be at risk of being disconnected from
                              public discovery and the menu if payment is not received promptly.
                            </>
                          )
                        ) : (
                          <>
                            Your next platform invoice is due within{' '}
                            {typeof billingNotice.days_until === 'number' ? billingNotice.days_until : 7} days. Pay on
                            time to help avoid your page being disconnected from public discovery.
                          </>
                        )}
                      </p>
                      {typeof billingNotice.due_date === 'string' ? (
                        <p className="mt-1 text-xs text-gray-500">
                          Due date: {billingNotice.due_date}
                          {typeof billingNotice.amount_cents === 'number'
                            ? ` · ${(billingNotice.amount_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Link href={vLink('/vendor/billing')}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-600/50 text-green-300 hover:bg-green-950/50"
                    >
                      Billing details
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Link href={vLink('/vendor/profile')}>
                <Button className="border border-green-900/20 bg-gray-800 text-white hover:bg-gray-700">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit profile & photos
                </Button>
              </Link>
              <Link href={vLink('/vendor/menu/product/new')}>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add menu item
                </Button>
              </Link>
              <Link href={vLink('/vendor/menu/sources')}>
                <Button variant="outline" className="border-green-600/40 text-green-400 hover:bg-green-600/10">
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect POS
                </Button>
              </Link>
              <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => refresh().then(loadStats)}>
                Refresh data
              </Button>
              <Button
                variant="outline"
                className="border-amber-600/40 text-amber-300 hover:bg-amber-700/10"
                onClick={() => void exportMenuRecoveryCsv()}
                disabled={exportingMenuCsv}
              >
                {exportingMenuCsv ? 'Exporting backup...' : 'Download menu backup (CSV)'}
              </Button>
            </div>
            <p className="text-xs text-amber-300/80">
              Keep this CSV safe for emergency menu recovery. You will need this file if we have to restore your menu.
            </p>

            {loadingStats ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
              </div>
            ) : (
              <Tabs value={dashTab} onValueChange={setDashTab} className="space-y-6">
                <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 overflow-x-auto border border-green-900/20 bg-gray-900 p-1">
                  <TabsTrigger value="overview" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="fulfillment"
                    className="shrink-0 gap-1.5 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Fulfillment
                  </TabsTrigger>
                  <TabsTrigger
                    value="hours"
                    className="shrink-0 gap-1.5 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Hours
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="deals" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Deals
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger
                    value="placements"
                    className="hidden shrink-0 md:flex data-[state=active]:bg-gray-800 data-[state=active]:text-green-400"
                  >
                    <span className="md:hidden">Smokers club</span>
                    <span className="hidden md:inline">Smokers Club</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Order revenue</p>
                      <p className="text-3xl font-bold text-white">${(revenueCents / 100).toFixed(2)}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {orderCount} orders (excludes {cancelledOrderCount} cancelled)
                      </p>
                    </Card>
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Est. gross profit</p>
                      <p className="text-3xl font-bold text-green-400">${(profitCents / 100).toFixed(2)}</p>
                      <p className="mt-2 text-xs text-gray-500">From line items × your unit costs</p>
                    </Card>
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Menu products</p>
                      <p className="text-3xl font-bold text-white">{productCount}</p>
                      <Link href={vLink('/vendor/menu')} className="mt-2 inline-block text-xs text-green-400 hover:underline">
                        Manage menu
                      </Link>
                    </Card>
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Reviews</p>
                      <p className="text-3xl font-bold text-white">{avgRating != null ? `${avgRating}` : '—'}</p>
                      <p className="mt-2 text-xs text-gray-500">{reviews.length} loaded</p>
                    </Card>
                  </div>

                  {isSupplyExchangeEnabled() && vendor?.id ? (
                    <Card className="border-sky-800/40 bg-gradient-to-br from-sky-950/40 via-zinc-950 to-black p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-sky-900/40 p-2 text-sky-300">
                            <Package className="h-6 w-6" aria-hidden />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Supply marketplace</h3>
                            <p className="mt-1 max-w-xl text-sm text-zinc-400">
                              Wholesale RFQs with curated suppliers — separate from your shopper storefront.
                            </p>
                            {supplyB2bLoading ? (
                              <Loader2 className="mt-3 h-5 w-5 animate-spin text-sky-400" />
                            ) : (
                              <p className="mt-2 text-sm text-zinc-300">
                                <span className="font-semibold text-white">{supplyRfqTotal ?? '—'}</span> RFQs
                                {supplyRfqOpen != null ? (
                                  <span className="text-zinc-500"> · {supplyRfqOpen} open / in review / quoted</span>
                                ) : null}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button asChild className="bg-sky-600 hover:bg-sky-500">
                            <Link href={vLink('/vendor/supply')}>Open supply marketplace</Link>
                          </Button>
                          <Button asChild variant="outline" className="border-sky-700/50 text-sky-100 hover:bg-sky-950/40">
                            <Link href={vLink('/vendor/supply/rfqs')}>My RFQs</Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : null}

                  <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                      <BarChart3 className="h-5 w-5 text-green-500" />
                      Storefront
                    </h3>
                    <div className="space-y-3 text-sm">
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="h-4 w-4 text-gray-500" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.website && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <a href={vendor.website} className="text-green-400 hover:underline" target="_blank" rel="noreferrer">
                            {vendor.website}
                          </a>
                        </div>
                      )}
                      {(vendor.address || vendor.city) && (
                        <div className="flex items-start gap-2 text-gray-300">
                          <MapPin className="mt-0.5 h-4 w-4 text-gray-500" />
                          <span>
                            {[vendor.address, vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="fulfillment" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">Order fulfillment</p>
                      <p className="text-sm text-gray-400">
                        Move orders through pending → accepted → en route → completed. Use the green buttons on{' '}
                        <span className="text-gray-300">All orders</span> for one-tap updates, or open an order for an
                        optional note to the customer. Shoppers see each step under <span className="text-gray-300">My orders</span>.
                      </p>
                    </div>
                    <Link href={vLink('/vendor/orders')}>
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        All orders
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['pending', fulfillmentCounts.pending],
                        ['accepted', fulfillmentCounts.accepted],
                        ['en_route', fulfillmentCounts.en_route],
                        ['completed', fulfillmentCounts.completed],
                        ['cancelled', fulfillmentCounts.cancelled],
                      ] as const
                    ).map(([key, n]) => (
                      <Badge key={key} variant="outline" className="border-green-800/50 text-gray-200">
                        {orderStatusLabel(key)}: {n}
                      </Badge>
                    ))}
                  </div>
                  {ordersPreview.length === 0 ? (
                    <Card className="border-green-900/20 bg-gray-900/50 p-8 text-center text-gray-400">
                      No orders yet. They appear here after checkout.
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {ordersPreview.map((o) => (
                        <Link key={o.id} href={vLink(`/vendor/orders/${o.id}`)}>
                          <Card className="border-green-900/20 bg-gray-800/50 p-4 transition hover:border-green-600/40">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-mono text-sm text-white">{o.id.slice(0, 8)}…</p>
                                <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-gray-600 text-gray-300">
                                  {orderStatusLabel(o.status)}
                                </Badge>
                                <span className="text-sm font-medium text-green-400">
                                  ${(o.total_cents / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="hours" className="space-y-4">
                  <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                    <h3 className="mb-1 flex items-center gap-2 text-xl font-bold text-white">
                      <Clock className="h-5 w-5 text-emerald-400" aria-hidden />
                      Business hours
                    </h3>
                    <VendorBusinessHoursPanel vendorId={(resolvedVendor ?? vendor).id} />
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  <VendorAnalyticsCharts
                    orders={chartOrders}
                    cancelledOrderCount={cancelledOrderCount}
                    cancelledOrdersValueCents={cancelledOrdersValueCents}
                    productCount={productCount}
                    reviewCount={reviews.length}
                    analyticsEventCount={analyticsEvents}
                    showTopSellingProducts
                  />
                  <VendorOrderHistoryExplorer
                    orders={allOrderRows}
                    storeStartYmd={storeStartYmd}
                    getOrderHref={(oid) => vLink(`/vendor/orders/${oid}`)}
                  />
                  <div className="text-center">
                    <Link href={vLink('/vendor/analytics')} className="text-sm text-green-400 hover:underline">
                      Open full analytics page
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="deals" className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Link href={vLink('/vendor/deals/new')}>
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Create new deal
                      </Button>
                    </Link>
                    <Link href={vLink('/vendor/deals')}>
                      <Button variant="outline" className="border-gray-600 text-gray-300">
                        Manage all deals
                      </Button>
                    </Link>
                  </div>
                  {deals.length === 0 ? (
                    <Card className="border-green-900/20 bg-gray-900/50 p-8 text-center text-gray-400">
                      No deals yet.{' '}
                      <Link href={vLink('/vendor/deals/new')} className="text-green-400 hover:underline">
                        Create one
                      </Link>
                    </Card>
                  ) : (
                    deals.map((d) => (
                      <Card key={d.id} className="border-green-900/20 bg-gray-800/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-white">{d.title}</p>
                            <p className="text-sm text-gray-500">
                              {d.discount_percent}% · {d.start_date} → {d.end_date}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" className="border-green-700/50 text-green-400" asChild>
                              <Link href={vLink(`/vendor/deals/${d.id}`)}>Edit</Link>
                            </Button>
                            <Badge variant="outline" className="border-green-600/40 text-green-400">
                              Active window
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                  <VendorReviewsManager vendorId={vendor.id} />
                  <p className="text-center text-sm text-gray-500">
                    <Link href={vLink('/vendor/reviews')} className="text-green-400 hover:underline">
                      Open reviews page
                    </Link>
                  </p>
                </TabsContent>

                <TabsContent value="placements" className="space-y-6">
                  <section className="md:hidden" aria-label="Smokers club">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Smokers club</p>
                    <div className="-mx-4 flex flex-nowrap gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-pl-4 scroll-pr-12 pb-3 pl-4 pr-12 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:-mx-6 sm:scroll-pr-16 sm:pl-6 sm:pr-16 [&::-webkit-scrollbar]:hidden">
                      {vendor.smokers_club_eligible === true ? (
                        <>
                          <Link
                            href={vLink('/vendor/advertising')}
                            className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 shadow-sm transition hover:border-green-600/45 hover:bg-gray-900/70 sm:max-w-[280px]"
                          >
                            <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                            <span className="font-semibold text-white">Tree &amp; CTR</span>
                            <span className="mt-2 text-sm text-gray-400">
                              Tree slot, click-through, and club tools—open the Smokers club page.
                            </span>
                            <span className="mt-3 text-sm font-medium text-green-400">Open insights →</span>
                          </Link>
                          <div className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 text-left shadow-sm sm:max-w-[280px]">
                            <Sparkles className="mb-3 h-8 w-8 text-brand-lime" aria-hidden />
                            <span className="font-semibold text-white">Discover</span>
                            <span className="mt-2 text-sm text-gray-400">
                              Shoppers see the club as featured-style cards on Discover—higher rungs first.
                            </span>
                          </div>
                          <Link
                            href={vLink('/vendor/ads')}
                            className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 shadow-sm transition hover:border-green-600/45 hover:bg-gray-900/70 sm:max-w-[280px]"
                          >
                            <Megaphone className="mb-3 h-8 w-8 text-brand-lime" aria-hidden />
                            <span className="font-semibold text-white">Sponsored ads</span>
                            <span className="mt-2 text-sm text-gray-400">
                              Different creative per page slot—hero, Discover, Deals, and more.
                            </span>
                            <span className="mt-3 text-sm font-medium text-green-400">Manage ads →</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <div className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-amber-900/30 bg-amber-950/20 p-4 shadow-sm sm:max-w-[280px]">
                            <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                            <span className="font-semibold text-white">Invite-only</span>
                            <span className="mt-2 text-sm text-gray-400">
                              Homepage tree placement for eligible shops—we review each store.
                            </span>
                          </div>
                          <Link
                            href={vLink('/vendor/advertising')}
                            className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-amber-900/30 bg-gray-900/50 p-4 shadow-sm transition hover:border-amber-600/40 sm:max-w-[280px]"
                          >
                            <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                            <span className="font-semibold text-white">Request access</span>
                            <span className="mt-2 text-sm text-gray-400">Learn more and email our team from one place.</span>
                            <span className="mt-3 text-sm font-medium text-amber-400">Open page →</span>
                          </Link>
                        </>
                      )}
                      <div className="min-w-6 shrink-0 sm:min-w-8" aria-hidden />
                    </div>
                  </section>

                  <div className="hidden space-y-6 md:block">
                    {vendor.smokers_club_eligible === true ? (
                      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                        <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
                          <Award className="h-5 w-5 text-amber-400" />
                          Smokers club visibility
                        </h3>
                        <p className="text-gray-400">
                          See your numbered tree slot and <strong className="text-gray-300">tree click-through rate</strong>{' '}
                          on the club. Higher slots (#1 is top) mean more prominence for{' '}
                          <span className="text-white">{vendor.name}</span>. Raw reach stats stay with our team.
                        </p>
                        <Link href={vLink('/vendor/advertising')}>
                          <Button className="mt-4 bg-green-600 hover:bg-green-700">Open Smokers club insights</Button>
                        </Link>
                      </Card>
                    ) : null}
                    {vendor.smokers_club_eligible === true ? (
                      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                        <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
                          <Megaphone className="h-5 w-5 text-brand-lime" />
                          Sponsored ads
                        </h3>
                        <p className="text-gray-400">
                          Upload a different image for each placement (homepage hero, Discover carousel, Deals, etc.). Submissions
                          are reviewed before they go live.
                        </p>
                        <Link href={vLink('/vendor/ads')}>
                          <Button variant="outline" className="mt-4 border-green-700/50 text-white hover:bg-gray-800">
                            Open sponsored ads
                          </Button>
                        </Link>
                      </Card>
                    ) : null}
                    {vendor.smokers_club_eligible !== true ? (
                      <Card className="border-amber-900/25 bg-gradient-to-br from-amber-950/30 to-black p-6">
                        <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
                          <Award className="h-5 w-5 text-amber-400" />
                          Smokers club
                        </h3>
                        <p className="text-gray-400">
                          Your shop is not marked Smokers club–eligible yet, so tree placement and club metrics stay hidden
                          here. Read what the program offers and send a request from the Smokers club page—we will review
                          your store for the homepage tree.
                        </p>
                        <Link href={vLink('/vendor/advertising')}>
                          <Button className="mt-4 bg-amber-600 hover:bg-amber-700">Learn more &amp; request access</Button>
                        </Link>
                      </Card>
                    ) : null}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
