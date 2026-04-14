"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Users, Store, TrendingUp, DollarSign, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Circle as XCircle, Eye, Flag } from 'lucide-react';

export default function AdminDashboard() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    pendingVendors: 0,
    totalReports: 0,
    activeListings: 0
  });
  const [pendingVendors, setPendingVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (isAdmin) {
        loadDashboardData();
      }
    }
  }, [authLoading, isAdmin]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const [usersRes, vendorsRes, pendingRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('vendor_profiles').select('id', { count: 'exact' }),
        supabase.from('vendor_profiles').select('*').eq('approval_status', 'pending'),
        supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending')
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalVendors: vendorsRes.count || 0,
        pendingVendors: pendingRes.data?.length || 0,
        totalReports: reportsRes.count || 0,
        activeListings: vendorsRes.count || 0
      });

      setPendingVendors(pendingRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveVendor(vendorId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from('vendor_profiles')
        .update({
          is_approved: true,
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', vendorId);

      loadDashboardData();
    } catch (error) {
      console.error('Error approving vendor:', error);
    }
  }

  async function handleRejectVendor(vendorId: string) {
    try {
      await supabase
        .from('vendor_profiles')
        .update({
          approval_status: 'rejected'
        })
        .eq('id', vendorId);

      loadDashboardData();
    } catch (error) {
      console.error('Error rejecting vendor:', error);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gradient-to-br from-gray-900 to-black border-red-900/20 p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You do not have permission to access this page</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Platform management and moderation</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Total Users</p>
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Total Vendors</p>
              <Store className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalVendors}</p>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-yellow-900/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Pending Approval</p>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.pendingVendors}</p>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-red-900/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Pending Reports</p>
              <Flag className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalReports}</p>
          </Card>
        </div>

        <Tabs defaultValue="vendors" className="space-y-6">
          <TabsList className="bg-gray-900 border border-green-900/20">
            <TabsTrigger value="vendors">
              Vendor Approval ({stats.pendingVendors})
            </TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            {pendingVendors.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                <p className="text-gray-400">No pending vendor applications</p>
              </Card>
            ) : (
              pendingVendors.map((vendor) => (
                <Card key={vendor.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{vendor.business_name}</h3>
                      <p className="text-gray-400 mb-3">{vendor.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="text-white capitalize">{vendor.business_type}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Location</p>
                          <p className="text-white">{vendor.city}, {vendor.state}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Phone</p>
                          <p className="text-white">{vendor.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="text-white">{vendor.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleApproveVendor(vendor.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectVendor(vendor.id)}
                        variant="outline"
                        className="border-red-900/20 text-red-500 hover:bg-red-500/10"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
              <Flag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Reports</h3>
              <p className="text-gray-400">All reports have been addressed</p>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
              <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
              <p className="text-gray-400">Detailed analytics coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
