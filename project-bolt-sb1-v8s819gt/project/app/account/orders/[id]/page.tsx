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
import { Package, MapPin, Phone, Clock, ArrowLeft, ShieldCheck, FileText, Lock, Truck, CircleCheck as CheckCircle, Download, Calendar, User } from 'lucide-react';

type Order = {
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

type OrderItem = {
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

export default function OrderDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [idDocument, setIdDocument] = useState<IdDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadOrder();
    }
  }, [user, authLoading, params.id, router]);

  const loadOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) {
        router.push('/account/orders');
        return;
      }

      setOrder(orderData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          price,
          products (name, image_url)
        `)
        .eq('order_id', params.id);

      if (itemsError) throw itemsError;
      setItems((itemsData as any) || []);

      const { data: docData, error: docError } = await supabase
        .from('order_documents')
        .select('*')
        .eq('order_id', params.id)
        .maybeSingle();

      if (!docError && docData) {
        setIdDocument(docData);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
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

  if (!order) {
    return null;
  }

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
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/account/orders">
            <Button variant="outline" className="border-green-600/30 hover:bg-green-600/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold mb-2">Order {order.order_number}</h1>
              <p className="text-gray-400">
                Placed on {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <h2 className="text-xl font-semibold mb-4">Order Items</h2>
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
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🌿
                        </div>
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
                  <span className="text-gray-400">Delivery Fee</span>
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
                    <h2 className="text-xl font-semibold mb-2">Identity Verification</h2>
                    <p className="text-gray-300 text-sm mb-4">
                      Your ID was securely uploaded and verified for this order.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Document Type</p>
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
                      <p className="font-medium">
                        {new Date(idDocument.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Lock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-200 font-medium mb-1">Privacy Protected</p>
                      <p className="text-gray-300">
                        Your ID is encrypted and securely stored. Only authorized personnel can access it for order verification.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">

            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
              <div className="space-y-4">
                {order.customer_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Name</p>
                      <p className="font-medium">{order.customer_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="font-medium">{order.delivery_address}</p>
                    {order.apartment_unit && <p className="font-medium">{order.apartment_unit}</p>}
                    <p className="font-medium">{order.delivery_city}, {order.delivery_zip}</p>
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
                      <p className="text-sm text-gray-400">Preferred Time</p>
                      <p className="font-medium">{order.preferred_delivery_time}</p>
                    </div>
                  </div>
                )}

                {(order.notes || order.delivery_notes) && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Delivery Notes</p>
                      <p className="font-medium">{order.notes || order.delivery_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Order Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Number</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Date</span>
                  <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Time</span>
                  <span className="font-medium">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {order.estimated_delivery && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Delivery</span>
                    <span className="font-medium">
                      {new Date(order.estimated_delivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Items</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <Separator className="my-2 bg-gray-800" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="font-medium text-green-400">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Need Help?</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full border-green-600/30 hover:bg-green-600/10">
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
                <Button variant="outline" className="w-full border-green-600/30 hover:bg-green-600/10">
                  <FileText className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
