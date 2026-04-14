"use client";

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

    if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.zipCode || !deliveryInfo.phone) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all delivery details',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const serviceId = items[0].serviceId;
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

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();

      toast({
        title: 'Order placed successfully!',
        description: `Your order ${orderNumber} has been received`,
      });

      router.push(`/account/orders/${order.id}`);
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to place order',
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
          <Button onClick={() => router.push('/directory')} className="bg-green-600 hover:bg-green-700">
            Browse Services
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold text-white mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.productId} className="bg-gray-900 border-green-900/20 p-6">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-green-900/10 rounded-lg flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🌿
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">{item.name}</h3>
                    <div className="flex gap-2 mb-2">
                      {item.thc && (
                        <span className="text-sm text-gray-400">THC {item.thc}%</span>
                      )}
                      {item.weight && (
                        <span className="text-sm text-gray-400">{item.weight}</span>
                      )}
                    </div>
                    <p className="text-green-500 font-bold text-xl">${item.price}</p>
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
              <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Delivery Fee</span>
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

            <Card className="bg-gray-900 border-green-900/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Delivery Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address" className="text-gray-300">Address</Label>
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
                    <Label htmlFor="city" className="text-gray-300">City</Label>
                    <Input
                      id="city"
                      value={deliveryInfo.city}
                      onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
                      placeholder="Los Angeles"
                      className="bg-black border-green-900/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-gray-300">Zip Code</Label>
                    <Input
                      id="zip"
                      value={deliveryInfo.zipCode}
                      onChange={(e) => setDeliveryInfo({ ...deliveryInfo, zipCode: e.target.value })}
                      placeholder="90001"
                      className="bg-black border-green-900/20 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                  <Input
                    id="phone"
                    value={deliveryInfo.phone}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="bg-black border-green-900/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-gray-300">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={deliveryInfo.notes}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                    placeholder="Any special instructions..."
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
              {loading ? 'Processing...' : 'Place Order'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By placing an order, you agree to our Terms of Service and confirm you are 21+
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
