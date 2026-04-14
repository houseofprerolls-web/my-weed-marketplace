'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VendorNav from '@/components/vendor/VendorNav';
import {
  Package,
  Clock,
  Truck,
  CircleCheck as CheckCircle,
  Search,
  DollarSign,
  Calendar,
  Loader2,
  XCircle,
  Printer,
  FileDown,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import {
  collectProductIdsFromOrders,
  orderGrossProfitCents,
  orderItemsArray,
} from '@/lib/orderProfit';
import {
  canVendorCancelStatus,
  canVendorMarkCompleteNow,
  nextFulfillmentStatus,
  normalizeOrderStatus,
  orderStatusLabel,
} from '@/lib/orderFulfillmentStatus';
import { vendorCompleteOrderNow, vendorFulfillmentRpc } from '@/lib/vendorOrderFulfillment';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { useToast } from '@/hooks/use-toast';
import {
  downloadVendorOrderReceiptPdf,
  openVendorOrderReceiptPdfTab,
  openVendorOrderReceiptPrintPreview,
  type VendorOrderReceiptPayload,
} from '@/lib/vendorOrderReceipt';

type OrderRow = {
  id: string;
  vendor_id: string;
  order_number: string | null;
  total_cents: number;
  subtotal_cents: number | null;
  delivery_fee_cents: number | null;
  tax_cents: number | null;
  sales_tax_cents: number | null;
  excise_tax_cents: number | null;
  status: string;
  items: unknown;
  created_at: string;
  pickup_or_delivery: string | null;
  is_scheduled: boolean | null;
  scheduled_for: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_zip: string | null;
  customer_phone: string | null;
  fulfillment_notes: string | null;
};

function receiptPayloadFromOrderRow(
  order: OrderRow,
  storeName: string | undefined,
  storeLogoUrl: string | null | undefined
): VendorOrderReceiptPayload {
  return {
    storeName: storeName ?? null,
    storeLogoUrl: storeLogoUrl ?? null,
    orderNumber: order.order_number,
    orderId: order.id,
    createdAt: order.created_at,
    status: order.status,
    pickupOrDelivery: order.pickup_or_delivery,
    scheduledFor: order.scheduled_for ?? undefined,
    items: order.items,
    subtotalCents: order.subtotal_cents,
    deliveryFeeCents: order.delivery_fee_cents,
    salesTaxCents: order.sales_tax_cents,
    exciseTaxCents: order.excise_tax_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    fulfillmentNotes: order.fulfillment_notes,
    deliveryAddress: order.delivery_address,
    deliveryCity: order.delivery_city,
    deliveryZip: order.delivery_zip,
    customerPhone: order.customer_phone,
  };
}

const DB_STATUSES = ['pending', 'accepted', 'en_route', 'completed', 'cancelled'] as const;

function statusStyle(status: string) {
  const s = normalizeOrderStatus(status);
  switch (s) {
    case 'pending':
      return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
    case 'accepted':
      return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
    case 'en_route':
      return 'bg-sky-600/20 text-sky-300 border-sky-600/30';
    case 'completed':
      return 'bg-green-600/20 text-green-400 border-green-600/30';
    case 'cancelled':
      return 'bg-red-600/20 text-red-400 border-red-600/30';
    default:
      return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  }
}

function statusIcon(status: string) {
  const s = normalizeOrderStatus(status);
  switch (s) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'accepted':
      return <Package className="h-4 w-4" />;
    case 'en_route':
      return <Truck className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Truck className="h-4 w-4" />;
  }
}

export default function VendorOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, ownedVendors, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [costMap, setCostMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of ownedVendors) {
      m.set(v.id, v.name);
    }
    return m;
  }, [ownedVendors]);

  const vendorLogoById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const v of ownedVendors) {
      m.set(v.id, v.logo_url ?? null);
    }
    return m;
  }, [ownedVendors]);

  const load = useCallback(async () => {
    const vendorIds = ownedVendors.map((v) => v.id).filter(Boolean);
    if (!vendorIds.length || !vendorsMode) {
      setOrders([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id,vendor_id,order_number,total_cents,subtotal_cents,delivery_fee_cents,tax_cents,sales_tax_cents,excise_tax_cents,status,items,created_at,pickup_or_delivery,is_scheduled,scheduled_for,delivery_address,delivery_city,delivery_zip,customer_phone,fulfillment_notes'
      )
      .in('vendor_id', vendorIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setOrders([]);
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as OrderRow[];
    setOrders(rows);

    const allIds = collectProductIdsFromOrders(rows.map((r) => r.items));
    if (allIds.length) {
      const { data: costs } = await supabase
        .from('product_unit_costs')
        .select('product_id, unit_cost_cents')
        .in('product_id', allIds);
      const m = new Map<string, number>();
      for (const r of (costs || []) as { product_id: string; unit_cost_cents: number }[]) {
        m.set(r.product_id, r.unit_cost_cents);
      }
      setCostMap(m);
    } else {
      setCostMap(new Map());
    }
    setLoading(false);
  }, [ownedVendors, vendorsMode]);

  const pushFulfillment = useCallback(
    async (orderId: string, newStatus: string) => {
      setAdvancingId(orderId);
      try {
        const { error } = await vendorFulfillmentRpc(orderId, newStatus, null);
        if (error) throw error;
        toast({
          title: 'Order updated',
          description: `Status is now ${orderStatusLabel(newStatus)}. The customer sees this under My orders.`,
        });
        await load();
      } catch (e) {
        toast({
          title: 'Could not update order',
          description: formatSupabaseError(e),
          variant: 'destructive',
        });
      } finally {
        setAdvancingId(null);
      }
    },
    [load, toast]
  );

  const storeNameForOrder = useCallback(
    (vendorId: string) => vendorNameById.get(vendorId) ?? vendor?.name,
    [vendorNameById, vendor?.name]
  );

  const receiptPayload = useCallback(
    (order: OrderRow) =>
      receiptPayloadFromOrderRow(order, storeNameForOrder(order.vendor_id), vendorLogoById.get(order.vendor_id) ?? null),
    [storeNameForOrder, vendorLogoById]
  );

  const completeOrderNow = useCallback(
    async (orderId: string) => {
      if (typeof window !== 'undefined' && !window.confirm('Mark this order completed now? The customer will see it as finished.')) {
        return;
      }
      setAdvancingId(orderId);
      try {
        const { error } = await vendorCompleteOrderNow(orderId, null);
        if (error) throw error;
        toast({
          title: 'Order completed',
          description: 'The customer will see this under My orders.',
        });
        await load();
      } catch (e) {
        toast({
          title: 'Could not complete order',
          description: formatSupabaseError(e),
          variant: 'destructive',
        });
      } finally {
        setAdvancingId(null);
      }
    },
    [load, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter((o) => normalizeOrderStatus(o.status) === activeTab);
  }, [orders, activeTab]);

  const q = searchQuery.trim().toLowerCase();
  const filtered = filteredByTab.filter((o) => {
    if (!q) return true;
    const inv = (o.order_number ?? '').toLowerCase();
    const store = (vendorNameById.get(o.vendor_id) ?? '').toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      inv.includes(q) ||
      store.includes(q) ||
      JSON.stringify(o.items).toLowerCase().includes(q)
    );
  });

  const countFor = (s: string) =>
    s === 'all' ? orders.length : orders.filter((o) => normalizeOrderStatus(o.status) === s).length;

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
        <Card className="border-green-900/30 bg-gray-900 p-6">Sign in with a linked dispensary to view orders.</Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          Orders require <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <VendorNav />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-gray-400">No dispensary linked to your account.</p>
        </div>
      </div>
    );
  }

  const multiStore = ownedVendors.length > 1;
  const pageTitle =
    multiStore && vendor
      ? `Orders — ${vendor.name} (+${ownedVendors.length - 1} more)`
      : vendor
        ? `Orders — ${vendor.name}`
        : 'Orders';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>

          <div className="min-w-0 space-y-6 md:col-span-3">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{pageTitle}</h1>
              <p className="text-gray-400">
                Use <span className="text-gray-300">Accept / En route / Complete</span> on each row to move orders
                forward—customers see updates instantly. Revenue and estimated gross profit use your unit costs.
                {multiStore ? ' Showing orders for all stores linked to your account.' : ''}
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice #, order id, store, or items…"
                className="border-green-900/20 bg-gray-800/50 pl-10 text-white"
              />
            </div>

            {loadError && (
              <Card className="border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
                Could not load orders: {loadError}
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {(['pending', 'accepted', 'en_route', 'completed', 'cancelled'] as const).map((s) => (
                <Card key={s} className="border-green-900/20 bg-gray-900/50 p-4">
                  <p className="mb-1 text-sm text-gray-400">{orderStatusLabel(s)}</p>
                  <p className="text-2xl font-bold">{countFor(s)}</p>
                </Card>
              ))}
            </div>

            <Card className="border-green-900/20 bg-gray-900/50 p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
            </div>
          ) : (
            <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 flex flex-wrap bg-gray-800/50 border-green-900/20">
                <TabsTrigger value="all">All ({countFor('all')})</TabsTrigger>
                {DB_STATUSES.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {orderStatusLabel(s)} ({countFor(s)})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                  <p className="text-gray-400">No orders in this tab</p>
                </div>
              ) : (
                filtered.map((order) => {
                  const profitCents = orderGrossProfitCents(order.items, costMap);
                  const lines = orderItemsArray(order.items);
                  const preview = lines
                    .map((l) => String(l.name ?? 'Item'))
                    .filter(Boolean)
                    .slice(0, 3);
                  const next = nextFulfillmentStatus(order.status);
                  const showCancel = canVendorCancelStatus(order.status);
                  const showCompleteNow =
                    canVendorMarkCompleteNow(order.status) && next !== 'completed';
                  const busy = advancingId === order.id;
                  return (
                    <Card key={order.id} className="border-gray-700 bg-gray-800/30 p-6 transition hover:border-green-600/30">
                      <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div className="flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-3">
                            <h3 className="font-mono text-lg font-semibold">
                              {order.order_number?.trim() || `…${order.id.slice(0, 8)}`}
                            </h3>
                            {multiStore && (
                              <Badge variant="outline" className="border-gray-600 font-normal text-gray-300">
                                {vendorNameById.get(order.vendor_id) ?? 'Store'}
                              </Badge>
                            )}
                            <Badge className={statusStyle(order.status)}>
                              {statusIcon(order.status)}
                              <span className="ml-1">{orderStatusLabel(order.status)}</span>
                            </Badge>
                            {order.pickup_or_delivery && (
                              <Badge variant="outline" className="border-gray-600 text-gray-300">
                                {order.pickup_or_delivery}
                              </Badge>
                            )}
                            {order.is_scheduled && order.scheduled_for && (
                              <Badge variant="outline" className="border-amber-600/40 text-amber-300">
                                Scheduled {new Date(order.scheduled_for).toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-6 text-sm text-gray-300">
                            <span className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-green-400" />
                              {new Date(order.created_at).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-400" />
                              Total ${(order.total_cents / 100).toFixed(2)}
                            </span>
                            <span className="flex items-center gap-2 text-green-400/90">
                              Est. gross profit ${(profitCents / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-gray-500">
                            {lines.length} line{lines.length !== 1 ? 's' : ''}
                            {preview.length ? ` · ${preview.join(', ')}` : ''}
                          </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[200px]">
                          {next && (
                            <Button
                              className="w-full bg-green-600 hover:bg-green-700"
                              disabled={busy}
                              onClick={() => pushFulfillment(order.id, next)}
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : next === 'accepted' ? (
                                'Accept order'
                              ) : next === 'en_route' ? (
                                'Mark en route'
                              ) : (
                                'Mark completed'
                              )}
                            </Button>
                          )}
                          {showCompleteNow && (
                            <Button
                              variant="outline"
                              className="w-full border-green-500/50 text-green-300 hover:bg-green-950/40"
                              disabled={busy}
                              onClick={() => completeOrderNow(order.id)}
                            >
                              Complete order now
                            </Button>
                          )}
                          {showCancel && (
                            <Button
                              variant="outline"
                              className="w-full border-red-600/40 text-red-300 hover:bg-red-600/10"
                              disabled={busy}
                              onClick={() => {
                                if (typeof window !== 'undefined' && !window.confirm('Cancel this order for the customer?')) {
                                  return;
                                }
                                pushFulfillment(order.id, 'cancelled');
                              }}
                            >
                              Cancel order
                            </Button>
                          )}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full border-zinc-600 text-gray-200 hover:bg-zinc-800"
                              disabled={receiptBusyId === order.id}
                              onClick={() => {
                                setReceiptBusyId(order.id);
                                try {
                                  openVendorOrderReceiptPrintPreview(receiptPayload(order));
                                } catch (e) {
                                  toast({
                                    title: 'Could not open print view',
                                    description: formatSupabaseError(e),
                                    variant: 'destructive',
                                  });
                                } finally {
                                  window.setTimeout(() => setReceiptBusyId(null), 400);
                                }
                              }}
                            >
                              <Printer className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                              Print
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full border-zinc-600 text-gray-200 hover:bg-zinc-800"
                              disabled={receiptBusyId === order.id}
                              onClick={async () => {
                                setReceiptBusyId(order.id);
                                try {
                                  const w = await openVendorOrderReceiptPdfTab(receiptPayload(order));
                                  if (!w) {
                                    toast({
                                      title: 'Pop-up blocked',
                                      description: 'Allow pop-ups for this site to view the PDF, or use Download.',
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (e) {
                                  toast({
                                    title: 'Could not open PDF',
                                    description: formatSupabaseError(e),
                                    variant: 'destructive',
                                  });
                                } finally {
                                  window.setTimeout(() => setReceiptBusyId(null), 400);
                                }
                              }}
                            >
                              <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                              View PDF
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full border-zinc-600 text-gray-200 hover:bg-zinc-800"
                              disabled={receiptBusyId === order.id}
                              onClick={async () => {
                                setReceiptBusyId(order.id);
                                try {
                                  await downloadVendorOrderReceiptPdf(receiptPayload(order));
                                } catch (e) {
                                  toast({
                                    title: 'Could not download PDF',
                                    description: formatSupabaseError(e),
                                    variant: 'destructive',
                                  });
                                } finally {
                                  window.setTimeout(() => setReceiptBusyId(null), 400);
                                }
                              }}
                            >
                              <FileDown className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                              Download
                            </Button>
                          </div>
                          <Link href={vLink(`/vendor/orders/${order.id}`)} className="w-full">
                            <Button variant="outline" className="w-full border-green-700/50 text-gray-200 hover:bg-green-900/20">
                              Details & note
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
            </>
          )}
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
