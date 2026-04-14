"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Heart, User, ShoppingBag, LogOut, UserPlus } from 'lucide-react';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';

type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
};

export default function AccountPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const vendorsSchema = useVendorsSchema();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingVendorInvites, setPendingVendorInvites] = useState<number | null>(null);
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadOrders();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !vendorsSchema) {
      setPendingVendorInvites(null);
      return;
    }
    let cancelled = false;
    void supabase.rpc('vendor_list_my_pending_invitations').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setPendingVendorInvites(null);
        return;
      }
      setPendingVendorInvites(Array.isArray(data) ? data.length : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [user, vendorsSchema]);

  const loadOrders = async () => {
    try {
      if (vendorsSchema) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_number, status, total_cents, created_at')
          .eq('consumer_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        const rows = (data || []) as Array<{
          id: string;
          order_number: string | null;
          status: string;
          total_cents: number | null;
          created_at: string;
        }>;
        setOrders(
          rows.map((o) => ({
            id: o.id,
            order_number: o.order_number?.trim() || `Order ${o.id.slice(0, 8)}`,
            status: o.status,
            total: (o.total_cents ?? 0) / 100,
            created_at: o.created_at,
          }))
        );
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'fulfilled':
        return 'bg-green-600/20 text-green-500 border-green-600/30';
      case 'confirmed':
        return 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30';
      case 'out_for_delivery':
        return 'bg-blue-600/20 text-blue-500 border-blue-600/30';
      case 'preparing':
        return 'bg-yellow-600/20 text-yellow-500 border-yellow-600/30';
      case 'cancelled':
        return 'bg-red-600/20 text-red-500 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-500 border-gray-600/30';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">My Account</h1>
            {profile?.username ? (
              <p className="mt-1 text-sm text-gray-400">
                Signed in as{' '}
                <Link
                  href={`/profile/${encodeURIComponent(profile.username)}`}
                  className="text-green-400 hover:underline"
                >
                  @{profile.username}
                </Link>
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-brand-red/40 text-gray-200 hover:bg-brand-red/10 sm:w-auto"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>

        <div className="mb-8">
            <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Link href="/account/orders">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition p-6 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <Package className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold text-white">{orders.length}</span>
              </div>
              <h3 className="text-white font-semibold text-lg">My Orders</h3>
              <p className="text-gray-400 text-sm">View order history</p>
            </Card>
          </Link>

          <Link href="/account/favorites">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition p-6 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <Heart className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold text-white">0</span>
              </div>
              <h3 className="text-white font-semibold text-lg">Favorites</h3>
              <p className="text-gray-400 text-sm">Saved services</p>
            </Card>
          </Link>

          <Link href="/account/profile">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition p-6 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <User className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-white font-semibold text-lg">Profile</h3>
              <p className="text-gray-400 text-sm">Edit your information</p>
            </Card>
          </Link>

          {vendorsSchema ? (
            <Link href="/account/invites">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition p-6 cursor-pointer">
                <div className="mb-4 flex items-center justify-between">
                  <UserPlus className="h-8 w-8 text-green-500" />
                  <span className="text-3xl font-bold text-white">
                    {pendingVendorInvites === null ? '—' : pendingVendorInvites}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">Vendor invites</h3>
                <p className="text-sm text-gray-400">Accept manager access for a shop</p>
              </Card>
            </Link>
          ) : null}
        </div>

        <Card className="bg-gray-900 border-green-900/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Recent Orders</h2>
            </div>
            <Link href="/account/orders">
              <Button variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
                View All
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-black/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-4">No orders yet</p>
              <Link href="/discover">
                <Button className="bg-green-600 hover:bg-green-700">
                  Start Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link key={order.id} href={`/account/orders/${order.id}`}>
                  <div className="bg-black/50 rounded-lg p-4 hover:bg-black/70 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold">{order.order_number}</h3>
                          <Badge className={getStatusColor(order.status)}>
                            {formatStatus(order.status)}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-xl">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
        </div>
      </div>
    </div>
  );
}
