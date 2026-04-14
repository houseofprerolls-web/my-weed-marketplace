"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, Star, TrendingUp } from 'lucide-react';

type Service = {
  id: string;
  name: string;
  rating: number;
  total_reviews: number;
};

type OrderStats = {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
};

export default function BusinessDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [stats, setStats] = useState<OrderStats>({
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadBusinessData();
    }
  }, [user, authLoading, router]);

  const loadBusinessData = async () => {
    try {
      const { data: serviceData, error: serviceError } = await supabase
        .from('delivery_services')
        .select('id, name, rating, total_reviews')
        .eq('owner_id', user!.id)
        .maybeSingle();

      if (serviceError) throw serviceError;

      if (serviceData) {
        setService(serviceData);

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total, status')
          .eq('service_id', serviceData.id);

        if (ordersError) throw ordersError;

        const totalOrders = ordersData?.length || 0;
        const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total, 0) || 0;
        const pendingOrders = ordersData?.filter(o => o.status === 'pending' || o.status === 'confirmed').length || 0;

        setStats({
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          pending_orders: pendingOrders,
        });
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="bg-gray-900 border-green-900/20 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-black py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">No Business Found</h2>
            <p className="text-gray-400 mb-6">
              You don't have a delivery service yet. Contact support to register your business.
            </p>
            <Button className="bg-green-600 hover:bg-green-700">
              Contact Support
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{service.name}</h1>
          <p className="text-gray-400">Business Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <Package className="h-8 w-8 text-green-500" />
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Orders</h3>
            <p className="text-3xl font-bold text-white">{stats.total_orders}</p>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8 text-green-500" />
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold text-white">${stats.total_revenue.toFixed(2)}</p>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <Package className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Pending Orders</h3>
            <p className="text-3xl font-bold text-white">{stats.pending_orders}</p>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <Star className="h-8 w-8 text-yellow-500 fill-current" />
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Rating</h3>
            <p className="text-3xl font-bold text-white">{service.rating.toFixed(1)}</p>
            <p className="text-gray-500 text-sm">{service.total_reviews} reviews</p>
          </Card>
        </div>

        <Card className="bg-gray-900 border-green-900/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white h-auto py-4">
              <div className="text-center">
                <Package className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">View Orders</div>
              </div>
            </Button>
            <Button variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white h-auto py-4">
              <div className="text-center">
                <Package className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">Manage Menu</div>
              </div>
            </Button>
            <Button variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white h-auto py-4">
              <div className="text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">Analytics</div>
              </div>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
