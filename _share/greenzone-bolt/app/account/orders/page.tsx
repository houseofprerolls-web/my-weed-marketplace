"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Package,
  Clock,
  Truck,
  CircleCheck as CheckCircle,
  FileText,
  MapPin,
  RotateCcw,
  Loader2,
  XCircle,
} from 'lucide-react';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { canCustomerCancelOrder } from '@/lib/orderFulfillmentStatus';
import { isPastOrderReorderable, runCustomerReorderFlow } from '@/lib/customerReorder';

type Order = {
  id: string;
  vendor_id?: string;
  orderLabel: string;
  status: string;
  total: number;
  created_at: string;
  delivery_address?: string | null;
  storeLabel?: string | null;
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { items, cartKind, replaceCartWith, addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadOrders();
    }
  }, [user, authLoading, router]);

  const loadOrders = async () => {
    try {
      if (isVendorsSchema()) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, vendor_id, order_number, status, total_cents, created_at, delivery_address')
          .eq('consumer_id', user!.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const rows = (data || []) as Array<{
          id: string;
          vendor_id: string;
          order_number: string | null;
          status: string;
          total_cents: number | null;
          created_at: string;
          delivery_address?: string | null;
        }>;
        const vendorIds = Array.from(new Set(rows.map((r) => r.vendor_id).filter(Boolean)));
        const nameById = new Map<string, string>();
        if (vendorIds.length) {
          const { data: vrows, error: vErr } = await supabase
            .from('vendors')
            .select('id, name')
            .in('id', vendorIds);
          if (!vErr && vrows) {
            for (const v of vrows as { id: string; name: string }[]) {
              nameById.set(v.id, v.name);
            }
          }
        }
        setOrders(
          rows.map((o) => ({
            id: o.id,
            vendor_id: o.vendor_id,
            orderLabel: o.order_number?.trim() || `Order ${o.id.slice(0, 8)}`,
            status: o.status,
            total: (o.total_cents ?? 0) / 100,
            created_at: o.created_at,
            delivery_address: o.delivery_address,
            storeLabel: nameById.get(o.vendor_id) ?? null,
          }))
        );
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at, delivery_address, customer_name')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as Array<{
        id: string;
        order_number: string;
        status: string;
        total: number;
        created_at: string;
        delivery_address?: string;
        customer_name?: string;
      }>;
      setOrders(
        rows.map((o) => ({
          id: o.id,
          orderLabel: o.order_number,
          status: o.status,
          total: o.total,
          created_at: o.created_at,
          delivery_address: o.delivery_address,
        }))
      );
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  async function handleReorder(orderId: string) {
    setReorderingId(orderId);
    try {
      const out = await runCustomerReorderFlow(orderId, {
        cartKind,
        items,
        replaceCartWith,
        addItem,
      });
      if (!out.ok) {
        toast({
          title: 'Reorder unavailable',
          description: out.message,
          variant: 'destructive',
        });
        return;
      }
      router.push(out.path);
    } finally {
      setReorderingId(null);
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (typeof window !== 'undefined' && !window.confirm('Cancel this order? The shop will be notified.')) {
      return;
    }
    setCancellingId(orderId);
    try {
      const { error } = await supabase.rpc('customer_cancel_order', { p_order_id: orderId });
      if (error) throw error;
      toast({
        title: 'Order cancelled',
        description: 'The shop will see this as cancelled.',
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
      );
    } catch (e) {
      toast({
        title: 'Could not cancel',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  }

  if (authLoading || !user) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'fulfilled':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'confirmed':
        return 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30';
      case 'out_for_delivery':
        return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      case 'preparing':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'cancelled':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'fulfilled':
        return <CheckCircle className="h-4 w-4" />;
      case 'out_for_delivery':
        return <Truck className="h-4 w-4" />;
      case 'preparing':
      case 'confirmed':
        return <Package className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const vendorsMode = isVendorsSchema();

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My orders</h1>
          <p className="text-gray-400">Track purchases and cancel pending orders you placed</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-gray-900/50 border-green-900/20 h-32 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="bg-gray-900/50 border-green-900/20 p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-gray-400 mb-6">Browse a shop menu and check out when you are ready</p>
            <Link href="/dispensaries">
              <Button className="bg-green-600 hover:bg-green-700">Browse shops</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const showReorder =
                vendorsMode &&
                order.vendor_id &&
                isPastOrderReorderable(order.status);
              const showCancel =
                vendorsMode && order.vendor_id && canCustomerCancelOrder(order.status);
              const busyReorder = reorderingId === order.id;
              const busyCancel = cancellingId === order.id;
              return (
                <Card
                  key={order.id}
                  className="bg-gray-900/50 border-green-900/20 hover:border-green-600/50 transition p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Link href={`/account/orders/${order.id}`} className="min-w-0 flex-1">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg">{order.orderLabel}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{formatStatus(order.status)}</span>
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-400">
                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {order.storeLabel && <p className="text-gray-500">{order.storeLabel}</p>}
                            {order.delivery_address && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <MapPin className="h-3 w-3" />
                                <span>{order.delivery_address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm text-gray-400 mb-1">Total</p>
                          <p className="font-bold text-2xl text-green-400">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col xl:flex-row">
                      {showCancel && (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-600/40 text-red-300 hover:bg-red-600/10"
                          disabled={busyCancel || busyReorder}
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          {busyCancel ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel order
                            </>
                          )}
                        </Button>
                      )}
                      {showReorder && (
                        <Button
                          type="button"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={busyReorder || busyCancel}
                          onClick={() => handleReorder(order.id)}
                        >
                          {busyReorder ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reorder
                            </>
                          )}
                        </Button>
                      )}
                      <Button variant="outline" className="border-green-600/30 hover:bg-green-600/10" asChild>
                        <Link href={`/account/orders/${order.id}`}>
                          <FileText className="h-4 w-4 mr-2" />
                          View details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
