"use client";

import { useCart, type CartItem, type LegacyCartLine, type VendorsCartLine } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, Trash2, ShoppingBag, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { vendorRowPublicMenuEnabled } from '@/lib/vendorOnlineMenuPolicy';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { generateClientInvoiceNumber } from '@/lib/orderInvoiceNumber';

function lineUnitPrice(item: CartItem): number {
  return item.kind === 'vendors' ? item.priceCents / 100 : item.price;
}

function lineLabel(item: CartItem): string {
  return item.kind === 'vendors' ? item.name : item.name;
}

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, subtotal, cartKind } = useCart();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery' | 'curbside'>('delivery');
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    notes: '',
  });

  const deliveryFee = 5.99;
  const tax = subtotal * 0.09;
  const total = subtotal + deliveryFee + tax;

  const vendorsCheckout =
    isVendorsSchema() && cartKind === 'vendors' && items.length > 0 && items[0].kind === 'vendors';

  const vendorsCartVendorId =
    vendorsCheckout && items[0].kind === 'vendors' ? items[0].vendorId : null;

  useEffect(() => {
    if (!vendorsCartVendorId || !isVendorsSchema()) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorsCartVendorId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      if (!vendorRowPublicMenuEnabled(data as Record<string, unknown>)) {
        clearCart();
        toast({
          title: 'Cart cleared',
          description: 'This shop is not accepting online orders right now.',
          variant: 'destructive',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsCartVendorId, clearCart, toast]);

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to place an order',
        variant: 'destructive',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add some products to your cart first',
        variant: 'destructive',
      });
      return;
    }

    const needsAddress = fulfillment === 'delivery' || fulfillment === 'curbside';
    if (needsAddress) {
      if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.zipCode || !deliveryInfo.phone) {
        toast({
          title: 'Missing information',
          description: 'Please fill in address, city, zip, and phone for this fulfillment type',
          variant: 'destructive',
        });
        return;
      }
    } else if (!deliveryInfo.phone) {
      toast({
        title: 'Missing phone',
        description: 'Please add a phone number so the shop can reach you',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (vendorsCheckout) {
        const vendorLines = items as VendorsCartLine[];
        const { data: vendorRow, error: vendorRowErr } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', vendorLines[0].vendorId)
          .maybeSingle();
        if (vendorRowErr || !vendorRow || !vendorRowPublicMenuEnabled(vendorRow as Record<string, unknown>)) {
          toast({
            title: 'Checkout unavailable',
            description: 'This shop is not accepting online orders. Your cart was cleared.',
            variant: 'destructive',
          });
          clearCart();
          setLoading(false);
          return;
        }

        // Required once: customer uploads ID to their profile. We copy it into
        // `order_documents` for each new order.
        if (!profile?.id_document_url) {
          toast({
            title: 'Upload ID required',
            description: 'Please upload your photo ID in your profile before placing an order.',
            variant: 'destructive',
          });
          setLoading(false);
          router.push('/account/profile');
          return;
        }

        const orderNumber = generateClientInvoiceNumber();
        const subtotalCents = Math.round(subtotal * 100);
        const deliveryFeeCents = Math.round(deliveryFee * 100);
        const taxCents = Math.round(tax * 100);
        const totalCents = subtotalCents + deliveryFeeCents + taxCents;

        const itemsJson = vendorLines.map((i) => ({
          product_id: i.productId,
          name: i.name,
          quantity: i.quantity,
          unit_price_cents: i.priceCents,
          image: i.image,
        }));

        const { data: orderRow, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: user.id,
            consumer_id: user.id,
            vendor_id: vendorLines[0].vendorId,
            items: itemsJson,
            total_cents: totalCents,
            subtotal_cents: subtotalCents,
            delivery_fee_cents: deliveryFeeCents,
            tax_cents: taxCents,
            sales_tax_cents: taxCents,
            excise_tax_cents: 0,
            status: 'pending',
            pickup_or_delivery: fulfillment,
            delivery_address: needsAddress ? deliveryInfo.address : null,
            delivery_city: needsAddress ? deliveryInfo.city : null,
            delivery_zip: needsAddress ? deliveryInfo.zipCode : null,
            customer_phone: deliveryInfo.phone,
            fulfillment_notes: deliveryInfo.notes || null,
          })
          .select('id')
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderRow?.id) {
          throw new Error('Order was not created. Check that migrations include order columns and RLS allows insert.');
        }

        const docType = profile.id_document_type ?? 'government_id';
        const verifiedStatus = profile.id_verified ? 'verified' : 'not_verified';
        const { error: docErr } = await supabase
          .from('order_documents')
          .insert({
            order_id: orderRow.id,
            uploaded_by: user.id,
            document_type: docType,
            file_url: profile.id_document_url,
            verified_status: verifiedStatus,
          });
        if (docErr) throw docErr;

        clearCart();

        toast({
          title: 'Order placed',
          description: `We sent order ${orderNumber} to the shop. You can track it under My orders.`,
        });

        router.push(`/account/orders/${orderRow.id}`);
        return;
      }

      // Legacy schema: order + order_items
      const legacyItems = items.filter((i): i is LegacyCartLine => i.kind === 'legacy');
      if (legacyItems.length !== items.length || legacyItems.length === 0) {
        toast({
          title: 'Unsupported cart',
          description: 'Clear your cart and try again from a shop page.',
          variant: 'destructive',
        });
        return;
      }

      const serviceId = legacyItems[0].serviceId;
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          service_id: serviceId,
          status: 'pending',
          subtotal,
          delivery_fee: deliveryFee,
          tax,
          total,
          delivery_address: deliveryInfo.address,
          delivery_city: deliveryInfo.city,
          delivery_zip: deliveryInfo.zipCode,
          phone: deliveryInfo.phone,
          notes: deliveryInfo.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = legacyItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();

      toast({
        title: 'Order placed successfully!',
        description: `Your order ${orderNumber} has been received`,
      });

      router.push(`/account/orders/${order.id}`);
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: formatSupabaseError(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-green-900/20 p-12 text-center max-w-md">
          <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Add some products to get started</p>
          <Button onClick={() => router.push('/dispensaries')} className="bg-green-600 hover:bg-green-700">
            Browse shops
          </Button>
        </Card>
      </div>
    );
  }

  const storeLabel =
    cartKind === 'vendors' && items[0].kind === 'vendors'
      ? items[0].vendorName
      : cartKind === 'legacy' && items[0].kind === 'legacy'
        ? items[0].serviceName
        : 'Your cart';

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold text-white mb-2">Shopping cart</h1>
        <p className="mb-8 flex items-center gap-2 text-gray-400">
          <Store className="h-4 w-4 text-green-500" />
          <span>
            One store per cart: <span className="text-white">{storeLabel}</span>
          </span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.productId} className="bg-gray-900 border-green-900/20 p-6">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-green-900/10 rounded-lg flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={lineLabel(item)}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🌿
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">{lineLabel(item)}</h3>
                    <div className="flex gap-2 mb-2">
                      {item.kind === 'vendors' ? (
                        <>
                          {item.thc != null && (
                            <span className="text-sm text-gray-400">THC {item.thc}%</span>
                          )}
                          {item.cbd != null && (
                            <span className="text-sm text-gray-400">CBD {item.cbd}%</span>
                          )}
                        </>
                      ) : (
                        <>
                          {item.thc != null && (
                            <span className="text-sm text-gray-400">THC {item.thc}%</span>
                          )}
                          {item.weight && (
                            <span className="text-sm text-gray-400">{item.weight}</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-green-500 font-bold text-xl">
                      ${lineUnitPrice(item).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.productId)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-8 w-8 border-green-900/20"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-white font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-8 w-8 border-green-900/20"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="bg-gray-900 border-green-900/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Order summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Delivery fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax (9%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator className="bg-green-900/20" />
                <div className="flex justify-between text-white font-bold text-xl">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {vendorsCheckout && (
              <Card className="bg-gray-900 border-green-900/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Fulfillment</h2>
                <Label className="text-gray-300 mb-2 block">How would you like to receive this order?</Label>
                <Select
                  value={fulfillment}
                  onValueChange={(v) => setFulfillment(v as typeof fulfillment)}
                >
                  <SelectTrigger className="border-green-900/30 bg-black text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pickup">In-store pickup</SelectItem>
                    <SelectItem value="curbside">Curbside</SelectItem>
                  </SelectContent>
                </Select>
              </Card>
            )}

            <Card className="bg-gray-900 border-green-900/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {fulfillment === 'pickup' ? 'Contact & notes' : 'Delivery information'}
              </h2>
              <div className="space-y-4">
                {(fulfillment === 'delivery' || fulfillment === 'curbside' || !vendorsCheckout) && (
                  <>
                    <div>
                      <Label htmlFor="address" className="text-gray-300">
                        Address
                      </Label>
                      <Input
                        id="address"
                        value={deliveryInfo.address}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                        placeholder="123 Main St"
                        className="bg-black border-green-900/20 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-gray-300">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={deliveryInfo.city}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
                          placeholder="Los Angeles"
                          className="bg-black border-green-900/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zip" className="text-gray-300">
                          Zip code
                        </Label>
                        <Input
                          id="zip"
                          value={deliveryInfo.zipCode}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, zipCode: e.target.value })}
                          placeholder="90001"
                          className="bg-black border-green-900/20 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="phone" className="text-gray-300">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={deliveryInfo.phone}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="bg-black border-green-900/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-gray-300">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={deliveryInfo.notes}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                    placeholder="Gate code, vehicle color, special instructions…"
                    className="bg-black border-green-900/20 text-white"
                  />
                </div>
              </div>
            </Card>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
            >
              {loading ? 'Processing…' : 'Place order'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By placing an order, you agree to our terms and confirm you are 21+ where required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
