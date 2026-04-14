"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Package,
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Lock,
  Truck,
  CircleCheck as CheckCircle,
  Download,
  User,
  Bell,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { orderItemsArray, lineQuantity, lineUnitPriceCents, type RawOrderItem } from '@/lib/orderProfit';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { canCustomerCancelOrder, normalizeOrderStatus, orderStatusLabel } from '@/lib/orderFulfillmentStatus';
import { isPastOrderReorderable, runCustomerReorderFlow } from '@/lib/customerReorder';

type LegacyOrder = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  delivery_address: string;
  delivery_city: string;
  delivery_zip: string;
  phone: string;
  notes: string | null;
  created_at: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
  customer_name?: string;
  apartment_unit?: string;
  delivery_notes?: string;
  preferred_delivery_time?: string;
};

type LegacyOrderItem = {
  id: string;
  quantity: number;
  price: number;
  products: {
    name: string;
    image_url: string | null;
  } | null;
};

type IdDocument = {
  id: string;
  document_type: string;
  file_url: string;
  verified_status: string;
  created_at: string;
};

type HubOrder = {
  id: string;
  vendor_id: string;
  order_number: string | null;
  status: string;
  items: unknown;
  total_cents: number;
  subtotal_cents: number | null;
  delivery_fee_cents: number | null;
  tax_cents: number | null;
  sales_tax_cents: number | null;
  excise_tax_cents: number | null;
  pickup_or_delivery: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_zip: string | null;
  customer_phone: string | null;
  fulfillment_notes: string | null;
  created_at: string;
  vendorName?: string | null;
  vendorLogoUrl?: string | null;
};

function hubLineTitle(line: RawOrderItem): string {
  if (typeof line.name === 'string' && line.name.trim()) return line.name;
  return 'Product';
}

function hubLineImage(line: RawOrderItem): string | null {
  if (typeof line.image === 'string') return line.image;
  return null;
}

export default function OrderDetailPage() {
  const { user, loading: authLoading, profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [hubOrder, setHubOrder] = useState<HubOrder | null>(null);
  const [legacyOrder, setLegacyOrder] = useState<LegacyOrder | null>(null);
  const [legacyItems, setLegacyItems] = useState<LegacyOrderItem[]>([]);
  const [idDocument, setIdDocument] = useState<IdDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadOrder();
    }
  }, [user, authLoading, orderId, router]);

  const loadOrder = async () => {
    setLoadError(null);
    setNotFound(false);
    try {
      if (isVendorsSchema()) {
        const { data: hub, error: hubErr } = await supabase
          .from('orders')
          .select(
            `
            id,
            vendor_id,
            order_number,
            status,
            items,
            total_cents,
            subtotal_cents,
            delivery_fee_cents,
            tax_cents,
            sales_tax_cents,
            excise_tax_cents,
            pickup_or_delivery,
            delivery_address,
            delivery_city,
            delivery_zip,
            customer_phone,
            fulfillment_notes,
            created_at
          `
          )
          .eq('id', orderId)
          .eq('consumer_id', user!.id)
          .maybeSingle();

        if (hubErr) {
          const msg = formatSupabaseError(hubErr);
          setHubOrder(null);
          setLegacyOrder(null);
          setLoadError(msg);
          toast({ title: 'Could not load order', description: msg, variant: 'destructive' });
          return;
        }
        if (hub) {
          let vendorName: string | null = null;
          let vendorLogoUrl: string | null = null;
          if (hub.vendor_id) {
            const { data: vn } = await supabase
              .from('vendors')
              .select('name,logo_url')
              .eq('id', hub.vendor_id)
              .maybeSingle();
            vendorName = (vn as { name?: string } | null)?.name ?? null;
            vendorLogoUrl = (vn as { logo_url?: string | null } | null)?.logo_url ?? null;
          }
          setHubOrder({ ...(hub as HubOrder), vendorName, vendorLogoUrl });
          setLegacyOrder(null);
          setLegacyItems([]);
          setIdDocument(null);
          return;
        }
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) {
        setNotFound(true);
        return;
      }

      setHubOrder(null);
      setLegacyOrder(orderData as LegacyOrder);

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(
          `
          id,
          quantity,
          price,
          products (name, image_url)
        `
        )
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setLegacyItems((itemsData as unknown as LegacyOrderItem[]) || []);

      const { data: docData, error: docError } = await supabase
        .from('order_documents')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!docError && docData) {
        setIdDocument(docData as IdDocument);
      } else {
        setIdDocument(null);
      }
    } catch (error) {
      console.error('Error loading order:', error);
      const msg = formatSupabaseError(error);
      setLoadError(msg);
      toast({ title: 'Could not load order', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelHub = async () => {
    if (!hubOrder || !canCustomerCancelOrder(hubOrder.status)) return;
    if (typeof window !== 'undefined' && !window.confirm('Cancel this order? The shop will be notified.')) {
      return;
    }
    setCancelling(true);
    try {
      const { error } = await supabase.rpc('customer_cancel_order', { p_order_id: hubOrder.id });
      if (error) throw error;
      setHubOrder((o) => (o ? { ...o, status: 'cancelled' } : o));
      toast({ title: 'Order cancelled', description: 'The shop will see this as cancelled.' });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not cancel',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-black py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="bg-gray-900 border-green-900/20 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError && !hubOrder && !legacyOrder) {
    return (
      <div className="min-h-screen bg-black py-12 text-white">
        <div className="container mx-auto max-w-lg px-4">
          <Link href="/account/orders">
            <Button variant="outline" className="mb-6 border-green-600/30 hover:bg-green-600/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to orders
            </Button>
          </Link>
          <Card className="border-red-900/40 bg-red-950/20 p-6">
            <p className="font-medium text-red-200">Something went wrong</p>
            <p className="mt-2 text-sm text-gray-300">{loadError}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black py-12 text-white">
        <div className="container mx-auto max-w-lg px-4">
          <Link href="/account/orders">
            <Button variant="outline" className="mb-6 border-green-600/30 hover:bg-green-600/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to orders
            </Button>
          </Link>
          <Card className="border-green-900/20 bg-gray-900 p-6">
            <p className="text-gray-200">We couldn&apos;t find that order, or it isn&apos;t linked to your account.</p>
          </Card>
        </div>
      </div>
    );
  }

  if (hubOrder) {
    return (
      <HubOrderDetailView
        order={hubOrder}
        onCancel={handleCancelHub}
        cancelling={cancelling}
        customerName={profile?.full_name ?? null}
        customerEmail={profile?.email ?? null}
      />
    );
  }

  if (!legacyOrder) {
    return null;
  }

  const order = legacyOrder;
  const items = legacyItems;
  const legacyCustomerName = order.customer_name || profile?.full_name || null;
  const legacyCustomerEmail = profile?.email || null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
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
        return <CheckCircle className="h-4 w-4" />;
      case 'out_for_delivery':
        return <Truck className="h-4 w-4" />;
      case 'preparing':
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

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/account/orders">
            <Button variant="outline" className="border-green-600/30 hover:bg-green-600/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to orders
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold mb-2">Order {order.order_number}</h1>
              <p className="text-gray-400">
                Placed on {new Date(order.created_at).toLocaleDateString()} at{' '}
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {getStatusIcon(order.status)}
              <span className="ml-1">{formatStatus(order.status)}</span>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-xl font-semibold mb-4">Order items</h2>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-800 last:border-0">
                    <div className="w-20 h-20 bg-green-900/10 rounded-lg flex-shrink-0">
                      {item.products?.image_url ? (
                        <img
                          src={item.products.image_url}
                          alt={item.products.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.products?.name || 'Product'}</h3>
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6 bg-gray-800" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery fee</span>
                  <span>${order.delivery_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <Separator className="my-3 bg-gray-800" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-400">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {idDocument && (
              <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-600/30 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <ShieldCheck className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">Identity verification</h2>
                    <p className="text-gray-300 text-sm mb-4">
                      Your ID was securely uploaded and verified for this order.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Document type</p>
                      <p className="font-medium capitalize">{idDocument.document_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Status</p>
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                        {idDocument.verified_status === 'not_verified' ? 'Verified' : idDocument.verified_status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Uploaded</p>
                      <p className="font-medium">{new Date(idDocument.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Lock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-200 font-medium mb-1">Privacy protected</p>
                      <p className="text-gray-300">
                        Your ID is encrypted and securely stored. Only authorized personnel can access it for order
                        verification.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery information</h2>
              <div className="space-y-4">
                {legacyCustomerName && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Name</p>
                      <p className="font-medium">{legacyCustomerName}</p>
                    </div>
                  </div>
                )}

                {legacyCustomerEmail && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="font-medium break-all">{legacyCustomerEmail}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="font-medium">{order.delivery_address}</p>
                    {order.apartment_unit && <p className="font-medium">{order.apartment_unit}</p>}
                    <p className="font-medium">
                      {order.delivery_city}, {order.delivery_zip}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="font-medium">{order.phone}</p>
                  </div>
                </div>

                {order.preferred_delivery_time && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Preferred time</p>
                      <p className="font-medium">{order.preferred_delivery_time}</p>
                    </div>
                  </div>
                )}

                {(order.notes || order.delivery_notes) && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Notes</p>
                      <p className="font-medium">{order.notes || order.delivery_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Order details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order number</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order date</span>
                  <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order time</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {order.estimated_delivery && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. delivery</span>
                    <span className="font-medium">
                      {new Date(order.estimated_delivery).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Total items</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <Separator className="my-2 bg-gray-800" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Total amount</span>
                  <span className="font-medium text-green-400">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Need help?</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full border-green-600/30 hover:bg-green-600/10">
                  <Download className="h-4 w-4 mr-2" />
                  Download invoice
                </Button>
                <Button variant="outline" className="w-full border-green-600/30 hover:bg-green-600/10">
                  <FileText className="h-4 w-4 mr-2" />
                  Contact support
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

type FulfillmentUpdateRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
};

function HubOrderDetailView({
  order,
  onCancel,
  cancelling,
  customerName,
  customerEmail,
}: {
  order: HubOrder;
  onCancel: () => void;
  cancelling: boolean;
  customerName: string | null;
  customerEmail: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { items, cartKind, replaceCartWith, addItem } = useCart();
  const [updates, setUpdates] = useState<FulfillmentUpdateRow[]>([]);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('order_fulfillment_updates')
        .select('id,status,message,created_at')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });
      if (cancelled || error) return;
      setUpdates((data || []) as FulfillmentUpdateRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  const lines = orderItemsArray(order.items);
  const subtotalCents = order.subtotal_cents ?? 0;
  const feeCents = order.delivery_fee_cents ?? 0;
  const salesTaxCents = order.sales_tax_cents ?? 0;
  const exciseTaxCents = order.excise_tax_cents ?? 0;
  const taxCents = order.tax_cents ?? salesTaxCents + exciseTaxCents;
  const totalCents = order.total_cents ?? 0;

  const label = order.order_number?.trim() || `Order ${order.id.slice(0, 8)}`;
  const store = order.vendorName;
  const storeLogo = order.vendorLogoUrl;

  const getStatusColor = (status: string) => {
    const s = normalizeOrderStatus(status);
    switch (s) {
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'accepted':
        return 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30';
      case 'en_route':
        return 'bg-sky-600/20 text-sky-300 border-sky-600/30';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'cancelled':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusIcon = (status: string) => {
    const s = normalizeOrderStatus(status);
    switch (s) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'accepted':
        return <Package className="h-4 w-4" />;
      case 'en_route':
        return <Truck className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const fmt = (cents: number) => (cents / 100).toFixed(2);

  const showReorder = isPastOrderReorderable(order.status);
  const showCancelCustomer = canCustomerCancelOrder(order.status);

  async function handleReorder() {
    setReordering(true);
    try {
      const out = await runCustomerReorderFlow(order.id, {
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
      setReordering(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/account/orders">
            <Button variant="outline" className="border-green-600/30 hover:bg-green-600/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to orders
            </Button>
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{label}</h1>
              {(store || storeLogo) && (
                <div className="flex items-center gap-3">
                  {storeLogo ? (
                    <img
                      src={storeLogo}
                      alt={store ?? 'Vendor'}
                      className="h-10 w-10 rounded-lg object-cover ring-1 ring-green-900/30 bg-black/40"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-900/50 ring-1 ring-green-900/30" />
                  )}
                  {store ? <p className="text-gray-400">{store}</p> : null}
                </div>
              )}
              <p className="mt-2 text-gray-500 text-sm">
                Placed {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={getStatusColor(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-1">{orderStatusLabel(order.status)}</span>
              </Badge>
              {showReorder && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={reordering}
                  onClick={() => handleReorder()}
                >
                  {reordering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reorder
                    </>
                  )}
                </Button>
              )}
              {showCancelCustomer && (
                <Button
                  variant="outline"
                  className="border-red-600/40 text-red-300 hover:bg-red-600/10"
                  disabled={cancelling}
                  onClick={onCancel}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel order'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h2 className="mb-4 text-xl font-semibold">Items</h2>
              <div className="mb-6 space-y-4">
                {lines.map((line, idx) => {
                  const q = lineQuantity(line);
                  const unit = lineUnitPriceCents(line);
                  const img = hubLineImage(line);
                  return (
                    <div
                      key={idx}
                      className="flex gap-4 border-b border-gray-800 pb-4 last:border-0"
                    >
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-green-900/10">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl">🌿</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{hubLineTitle(line)}</h3>
                        <p className="text-sm text-gray-400">Qty {q}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${fmt(unit * q)}</p>
                        <p className="text-xs text-gray-500">${fmt(unit)} each</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Separator className="my-6 bg-gray-800" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span>${fmt(subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Delivery</span>
                  <span>${fmt(feeCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sales tax</span>
                  <span>${fmt(salesTaxCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Excise tax</span>
                  <span>${fmt(exciseTaxCents)}</span>
                </div>
                <Separator className="my-3 bg-gray-800" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-400">${fmt(totalCents)}</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold">Fulfillment</h2>
              <p className="text-sm text-gray-400 capitalize">{order.pickup_or_delivery || '—'}</p>
              {(customerName || customerEmail) && (
                <div className="mt-4 flex gap-3">
                  <User className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-400">Customer</p>
                    {customerName ? <p className="font-medium break-words">{customerName}</p> : <p className="font-medium text-gray-200">—</p>}
                    {customerEmail && <p className="text-xs text-gray-500 break-all">{customerEmail}</p>}
                  </div>
                </div>
              )}
              {order.delivery_address && (
                <div className="mt-4 flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="font-medium">{order.delivery_address}</p>
                    {(order.delivery_city || order.delivery_zip) && (
                      <p className="font-medium">
                        {[order.delivery_city, order.delivery_zip].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {order.customer_phone && (
                <div className="mt-4 flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="font-medium">{order.customer_phone}</p>
                  </div>
                </div>
              )}
              {order.fulfillment_notes && (
                <div className="mt-4 flex gap-3">
                  <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Your notes</p>
                    <p className="font-medium">{order.fulfillment_notes}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Bell className="h-5 w-5 text-green-400" />
                Updates from the store
              </h2>
              {updates.length === 0 ? (
                <p className="text-sm text-gray-500">
                  When the dispensary accepts or moves your order, messages appear here.
                </p>
              ) : (
                <ul className="space-y-4">
                  {updates.map((u) => (
                    <li key={u.id} className="border-l-2 border-green-600/40 pl-4">
                      <p className="text-xs text-gray-500">
                        {new Date(u.created_at).toLocaleString()} · {orderStatusLabel(u.status)}
                      </p>
                      <p className="mt-1 text-sm text-gray-200">{u.message || orderStatusLabel(u.status)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
