"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VendorNav from '@/components/vendor/VendorNav';
import { ArrowLeft, MapPin, Phone, Clock, Package, Truck, CircleCheck as CheckCircle, FileText, ShieldCheck, Calendar, User, DollarSign, Download, Eye, Lock } from 'lucide-react';

export default function VendorOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState('pending');
  const [showIdPreview, setShowIdPreview] = useState(false);

  const order = {
    id: params.id,
    orderNumber: 'GZ20260307001',
    customerName: 'John Doe',
    phone: '(555) 987-6543',
    address: '123 Main Street, Apt 4B',
    city: 'Los Angeles, CA 90001',
    status: orderStatus,
    items: [
      {
        id: '1',
        name: 'Blue Dream 3.5g',
        brand: 'Premium Flowers',
        quantity: 1,
        price: 45.00,
        image: 'https://images.pexels.com/photos/7148942/pexels-photo-7148942.jpeg?auto=compress&cs=tinysrgb&w=200',
      },
      {
        id: '2',
        name: 'Sour Diesel Pre-Roll',
        brand: 'Quick Puffs',
        quantity: 2,
        price: 12.00,
        image: 'https://images.pexels.com/photos/7195950/pexels-photo-7195950.jpeg?auto=compress&cs=tinysrgb&w=200',
      },
    ],
    subtotal: 69.00,
    deliveryFee: 10.00,
    tax: 5.52,
    total: 84.52,
    deliveryNotes: 'Please ring doorbell',
    preferredTime: '14:00',
    idDocument: {
      uploaded: true,
      documentType: 'government_id',
      fileName: 'drivers_license.jpg',
      uploadedAt: new Date('2026-03-07T10:28:00'),
      fileUrl: 'https://images.pexels.com/photos/5011647/pexels-photo-5011647.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date('2026-03-07T10:30:00'),
        note: 'Order placed',
      },
    ],
    createdAt: new Date('2026-03-07T10:30:00'),
  };

  const handleStatusUpdate = (newStatus: string) => {
    setOrderStatus(newStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'preparing':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'out_for_delivery':
        return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Package className="h-4 w-4" />;
      case 'out_for_delivery':
        return <Truck className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <VendorNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/vendor/orders">
            <Button variant="outline" className="border-green-600/30 hover:bg-green-600/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Order {order.orderNumber}</h1>
              <p className="text-gray-400">
                Placed on {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-800 last:border-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-400">{item.brand}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-400">Qty: {item.quantity}</span>
                        <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
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
                  <span>${order.deliveryFee.toFixed(2)}</span>
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

            <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-600/30 p-6">
              <div className="flex items-start gap-4 mb-4">
                <ShieldCheck className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Customer ID Document</h2>
                  <p className="text-gray-300 text-sm mb-4">
                    The customer has uploaded identification for this order. Access is restricted to authorized personnel only.
                  </p>
                </div>
              </div>

              {order.idDocument.uploaded ? (
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">Document Type</p>
                        <p className="font-medium capitalize">{order.idDocument.documentType.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Uploaded</p>
                        <p className="font-medium">
                          {order.idDocument.uploadedAt.toLocaleDateString()} {order.idDocument.uploadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">File Name</p>
                        <p className="font-medium">{order.idDocument.fileName}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Status</p>
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                          Verified
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowIdPreview(!showIdPreview)}
                      variant="outline"
                      className="flex-1 border-green-600/30 hover:bg-green-600/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showIdPreview ? 'Hide' : 'View'} Document
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-green-600/30 hover:bg-green-600/10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  {showIdPreview && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                        <Lock className="h-4 w-4" />
                        <span>Secure Document Preview</span>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                        <img
                          src={order.idDocument.fileUrl}
                          alt="Customer ID Document"
                          className="w-full h-auto"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        This document is confidential and must be handled according to privacy regulations
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Lock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-200 font-medium mb-1">Privacy Notice</p>
                        <p className="text-gray-300">
                          Customer ID documents are encrypted and access is logged. Only use for order verification purposes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-200 font-medium mb-1">ID Not Uploaded</p>
                      <p className="text-gray-300">
                        Customer has not uploaded identification for this order yet.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-xl font-semibold mb-4">Order Status History</h2>
              <div className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                        {getStatusIcon(history.status)}
                      </div>
                      {index < order.statusHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-800 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium capitalize">{history.status.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-400">{history.note}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {history.timestamp.toLocaleDateString()} at {history.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Update Order Status</h2>
              <Select value={orderStatus} onValueChange={handleStatusUpdate}>
                <SelectTrigger className="bg-gray-800/50 border-green-900/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-2">
                Customer will receive notifications when status changes
              </p>
            </Card>

            <Card className="bg-gray-900/50 border-green-900/20 p-6">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="font-medium">{order.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Delivery Address</p>
                    <p className="font-medium">{order.address}</p>
                    <p className="font-medium">{order.city}</p>
                  </div>
                </div>

                {order.preferredTime && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Preferred Time</p>
                      <p className="font-medium">{order.preferredTime}</p>
                    </div>
                  </div>
                )}

                {order.deliveryNotes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Delivery Notes</p>
                      <p className="font-medium">{order.deliveryNotes}</p>
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
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Date</span>
                  <span className="font-medium">{order.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Items</span>
                  <span className="font-medium">{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="font-medium text-green-400">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
