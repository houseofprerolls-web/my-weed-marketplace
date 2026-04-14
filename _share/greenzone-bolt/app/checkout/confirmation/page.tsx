"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleCheck as CheckCircle, Package, Truck, Clock, MapPin, Phone, Mail, FileText, Download, ArrowRight } from 'lucide-react';

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get('order') || 'GZ20260307001';

  const orderDetails = {
    orderNumber,
    status: 'pending',
    vendor: {
      name: 'GreenLeaf Dispensary',
      logo: 'https://images.pexels.com/photos/1089842/pexels-photo-1089842.jpeg?auto=compress&cs=tinysrgb&w=100',
      phone: '(555) 123-4567',
    },
    customer: {
      name: 'John Doe',
      phone: '(555) 987-6543',
      address: '123 Main Street, Apt 4B',
      city: 'Los Angeles, CA 90001',
    },
    items: [
      {
        name: 'Blue Dream 3.5g',
        brand: 'Premium Flowers',
        price: 45.00,
        quantity: 1,
      },
      {
        name: 'Sour Diesel Pre-Roll',
        brand: 'Quick Puffs',
        price: 12.00,
        quantity: 2,
      },
    ],
    pricing: {
      subtotal: 69.00,
      deliveryFee: 10.00,
      tax: 5.52,
      total: 84.52,
    },
    estimatedDelivery: '2-3 hours',
    idUploaded: true,
    createdAt: new Date().toLocaleString(),
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600/20 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-400">
            Thank you for your order. We'll send you a confirmation email shortly.
          </p>
        </div>

        {/* Order Number */}
        <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-green-600/30 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Order Number</p>
              <p className="text-2xl font-bold">{orderDetails.orderNumber}</p>
            </div>
            <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              Pending
            </Badge>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Vendor Info */}
          <Card className="bg-gray-900/50 border-green-900/20 p-6">
            <h2 className="text-lg font-semibold mb-4">Vendor</h2>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={orderDetails.vendor.logo}
                alt={orderDetails.vendor.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <p className="font-semibold">{orderDetails.vendor.name}</p>
                <p className="text-sm text-gray-400">{orderDetails.vendor.phone}</p>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Clock className="h-4 w-4 text-green-400" />
                <span>Estimated Delivery: {orderDetails.estimatedDelivery}</span>
              </div>
            </div>
          </Card>

          {/* Delivery Address */}
          <Card className="bg-gray-900/50 border-green-900/20 p-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">{orderDetails.customer.name}</p>
                  <p className="text-gray-400">{orderDetails.customer.address}</p>
                  <p className="text-gray-400">{orderDetails.customer.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="h-4 w-4 text-green-400" />
                <span>{orderDetails.customer.phone}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="bg-gray-900/50 border-green-900/20 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-4 mb-6">
            {orderDetails.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-400">{item.brand}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Price Summary */}
          <div className="space-y-2 pt-4 border-t border-gray-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span>${orderDetails.pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Delivery Fee</span>
              <span>${orderDetails.pricing.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tax</span>
              <span>${orderDetails.pricing.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-800">
              <span>Total</span>
              <span className="text-green-400">${orderDetails.pricing.total.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* ID Verification Status */}
        <Card className="bg-green-900/10 border-green-600/30 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1">Identity Verification Complete</p>
              <p className="text-sm text-gray-300">
                Your ID has been securely uploaded and attached to this order.
              </p>
            </div>
            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
              ID Uploaded
            </Badge>
          </div>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/account/orders">
            <Button variant="outline" className="w-full border-green-600/30 hover:bg-green-600/10">
              <Package className="h-4 w-4 mr-2" />
              View All Orders
            </Button>
          </Link>
          <Link href="/">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Continue Shopping
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Order Tracking Info */}
        <Card className="bg-blue-600/10 border-blue-600/30 p-6 mt-6">
          <div className="flex gap-3">
            <Truck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-2">Track Your Order</p>
              <p className="text-sm text-gray-300 mb-3">
                You'll receive real-time updates on your order status. The vendor will notify you when your order is on its way.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="border-gray-600">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
                <Badge variant="outline" className="border-gray-600">
                  Preparing
                </Badge>
                <Badge variant="outline" className="border-gray-600">
                  Out for Delivery
                </Badge>
                <Badge variant="outline" className="border-gray-600">
                  Completed
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
