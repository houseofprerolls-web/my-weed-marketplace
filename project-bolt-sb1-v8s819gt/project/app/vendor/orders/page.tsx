"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import VendorNav from '@/components/vendor/VendorNav';
import { Package, Clock, Truck, CircleCheck as CheckCircle, Search, MapPin, Phone, FileText, ShieldCheck, Calendar, DollarSign } from 'lucide-react';

export default function VendorOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const orders = [
    {
      id: '1',
      orderNumber: 'GZ20260307001',
      customerName: 'John Doe',
      phone: '(555) 987-6543',
      address: '123 Main Street, Apt 4B',
      city: 'Los Angeles, CA 90001',
      status: 'pending',
      items: [
        { name: 'Blue Dream 3.5g', quantity: 1, price: 45.00 },
        { name: 'Sour Diesel Pre-Roll', quantity: 2, price: 12.00 },
      ],
      subtotal: 69.00,
      deliveryFee: 10.00,
      tax: 5.52,
      total: 84.52,
      idUploaded: true,
      deliveryNotes: 'Please ring doorbell',
      preferredTime: '14:00',
      createdAt: new Date('2026-03-07T10:30:00'),
    },
    {
      id: '2',
      orderNumber: 'GZ20260307002',
      customerName: 'Jane Smith',
      phone: '(555) 123-4567',
      address: '456 Oak Avenue',
      city: 'Los Angeles, CA 90002',
      status: 'preparing',
      items: [
        { name: 'OG Kush 7g', quantity: 1, price: 80.00 },
      ],
      subtotal: 80.00,
      deliveryFee: 10.00,
      tax: 6.40,
      total: 96.40,
      idUploaded: true,
      deliveryNotes: '',
      preferredTime: '',
      createdAt: new Date('2026-03-07T11:15:00'),
    },
    {
      id: '3',
      orderNumber: 'GZ20260307003',
      customerName: 'Mike Johnson',
      phone: '(555) 555-5555',
      address: '789 Pine Street, Unit 2',
      city: 'Los Angeles, CA 90003',
      status: 'out_for_delivery',
      items: [
        { name: 'Wedding Cake 3.5g', quantity: 2, price: 50.00 },
        { name: 'Edible Gummies 10mg', quantity: 1, price: 25.00 },
      ],
      subtotal: 125.00,
      deliveryFee: 10.00,
      tax: 10.00,
      total: 145.00,
      idUploaded: true,
      deliveryNotes: 'Call when nearby',
      preferredTime: '16:30',
      createdAt: new Date('2026-03-07T09:00:00'),
    },
    {
      id: '4',
      orderNumber: 'GZ20260306010',
      customerName: 'Sarah Williams',
      phone: '(555) 999-8888',
      address: '321 Maple Drive',
      city: 'Los Angeles, CA 90004',
      status: 'completed',
      items: [
        { name: 'Gelato 3.5g', quantity: 1, price: 45.00 },
      ],
      subtotal: 45.00,
      deliveryFee: 10.00,
      tax: 3.60,
      total: 58.60,
      idUploaded: true,
      deliveryNotes: '',
      preferredTime: '',
      createdAt: new Date('2026-03-06T15:20:00'),
    },
  ];

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const filterOrdersByStatus = (status: string) => {
    if (status === 'all') return orders;
    return orders.filter(order => order.status === status);
  };

  const filteredOrders = filterOrdersByStatus(activeTab).filter(order =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOrderCount = (status: string) => {
    if (status === 'all') return orders.length;
    return orders.filter(order => order.status === status).length;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <VendorNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Order Management</h1>
          <p className="text-gray-400">View and manage customer orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-yellow-600/10 border-yellow-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold">{getOrderCount('pending')}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="bg-blue-600/10 border-blue-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Preparing</p>
                <p className="text-2xl font-bold">{getOrderCount('preparing')}</p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-purple-600/10 border-purple-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Out for Delivery</p>
                <p className="text-2xl font-bold">{getOrderCount('out_for_delivery')}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-400" />
            </div>
          </Card>

          <Card className="bg-green-600/10 border-green-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Completed Today</p>
                <p className="text-2xl font-bold">{getOrderCount('completed')}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </Card>
        </div>

        <Card className="bg-gray-900/50 border-green-900/20 p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order number or customer name..."
                className="pl-10 bg-gray-800/50 border-green-900/20 text-white"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-800/50 border-green-900/20 mb-6">
              <TabsTrigger value="pending">Pending ({getOrderCount('pending')})</TabsTrigger>
              <TabsTrigger value="preparing">Preparing ({getOrderCount('preparing')})</TabsTrigger>
              <TabsTrigger value="out_for_delivery">Out for Delivery ({getOrderCount('out_for_delivery')})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({getOrderCount('completed')})</TabsTrigger>
              <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
            </TabsList>

            {['pending', 'preparing', 'out_for_delivery', 'completed', 'all'].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No orders found</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="bg-gray-800/30 border-gray-700 p-6 hover:border-green-600/30 transition">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{getStatusLabel(order.status)}</span>
                            </Badge>
                            {order.idUploaded && (
                              <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                ID Verified
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">{order.customerName}</p>
                                  <p className="text-gray-400">{order.address}</p>
                                  <p className="text-gray-400">{order.city}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-400" />
                                <span className="text-gray-300">{order.phone}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-400" />
                                <span className="text-gray-300">
                                  {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {order.preferredTime && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-green-400" />
                                  <span className="text-gray-300">Preferred: {order.preferredTime}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-400" />
                                <span className="text-gray-300 font-semibold">${order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {order.deliveryNotes && (
                            <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                              <p className="text-sm text-gray-400">
                                <span className="font-medium">Delivery Notes:</span> {order.deliveryNotes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Link href={`/vendor/orders/${order.id}`}>
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Package className="h-4 w-4" />
                            <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex gap-2">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <span key={idx} className="text-gray-400">
                                {item.name}
                                {idx < Math.min(order.items.length, 3) - 1 && ','}
                              </span>
                            ))}
                            {order.items.length > 3 && (
                              <span className="text-gray-400">+{order.items.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
