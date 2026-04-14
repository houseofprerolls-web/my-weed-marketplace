"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Store,
  TrendingUp,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  Flag,
  ClipboardList,
  Mail,
  Phone,
  MapPin,
  ImagePlus,
} from 'lucide-react';
import { AdminSmokersClubBannersPanel } from '@/components/admin/AdminSmokersClubBannersPanel';

type VendorLeadRow = {
  id: string;
  created_at: string;
  business_name: string;
  contact_email: string;
  contact_phone: string;
  zip: string;
  license_number: string | null;
  status: string;
  reviewed_at: string | null;
  created_vendor_id: string | null;
};

type VendorUpgradeRequestRow = {
  id: string;
  created_at: string;
  vendor_id: string | null;
  user_id: string;
  email: string;
  context: string | null;
  status: string;
};

type ReviewVendorReportRow = {
  id: string;
  created_at: string;
  review_id: string;
  vendor_id: string;
  reason: string;
  status: string;
};

export default function AdminDashboard() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    pendingVendors: 0,
    pendingVendorLeads: 0,
    totalReports: 0,
    activeListings: 0,
    pendingHomepageBanners: 0,
  });
  const [dashTab, setDashTab] = useState('vendors');
  const [pendingVendors, setPendingVendors] = useState<any[]>([]);
  const [vendorLeads, setVendorLeads] = useState<VendorLeadRow[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<VendorUpgradeRequestRow[]>([]);
  const [reviewReports, setReviewReports] = useState<ReviewVendorReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const usersRes = await supabase.from('profiles').select('id', { count: 'exact', head: true });

      const vendorsRes = isVendorsSchema()
        ? await supabase.from('vendors').select('id', { count: 'exact', head: true })
        : await supabase.from('vendor_profiles').select('id', { count: 'exact', head: true });

      const pendingRes = isVendorsSchema()
        ? await supabase
            .from('vendors')
            .select('*')
            .in('license_status', ['pending', 'needs_review'])
        : await supabase.from('vendor_profiles').select('*').eq('approval_status', 'pending');

      const reportsRes = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      const leadsRes = await supabase
        .from('vendor_lead_applications')
        .select(
          'id, created_at, business_name, contact_email, contact_phone, zip, license_number, status, reviewed_at, created_vendor_id'
        )
        .order('created_at', { ascending: false });

      const leads = (leadsRes.error ? [] : leadsRes.data) as VendorLeadRow[];
      const pendingLeads = leads.filter((l) => l.status === 'pending').length;

      let pendingHomepageBanners = 0;
      if (isVendorsSchema()) {
        const banRes = await supabase
          .from('smokers_club_homepage_banners')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (!banRes.error && typeof banRes.count === 'number') {
          pendingHomepageBanners = banRes.count;
        }
      }

      setStats({
        totalUsers: usersRes.count || 0,
        totalVendors: vendorsRes.count || 0,
        pendingVendors: pendingRes.data?.length || 0,
        pendingVendorLeads: pendingLeads,
        totalReports: reportsRes.error ? 0 : reportsRes.count || 0,
        activeListings: vendorsRes.count || 0,
        pendingHomepageBanners,
      });

      setPendingVendors(pendingRes.data || []);
      setVendorLeads(leads);

      const upRes = await supabase
        .from('vendor_upgrade_requests')
        .select('id, created_at, vendor_id, user_id, email, context, status')
        .order('created_at', { ascending: false })
        .limit(200);
      setUpgradeRequests(upRes.error ? [] : ((upRes.data || []) as VendorUpgradeRequestRow[]));

      const rrRes = await supabase
        .from('review_vendor_reports')
        .select('id, created_at, review_id, vendor_id, reason, status')
        .order('created_at', { ascending: false })
        .limit(200);
      setReviewReports(rrRes.error ? [] : ((rrRes.data || []) as ReviewVendorReportRow[]));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      void loadDashboardData();
    }
  }, [authLoading, isAdmin, loadDashboardData]);

  async function handleApproveVendor(vendorId: string) {
    try {
      if (isVendorsSchema()) {
        const { error } = await supabase.rpc('admin_approve_vendor', { p_vendor_id: vendorId });
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('vendor_profiles')
          .update({
            is_approved: true,
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.id,
          })
          .eq('id', vendorId);
      }

      loadDashboardData();
    } catch (error) {
      console.error('Error approving vendor:', error);
    }
  }

  async function handleRejectVendor(vendorId: string) {
    try {
      if (isVendorsSchema()) {
        const { error } = await supabase.rpc('admin_reject_vendor', { p_vendor_id: vendorId });
        if (error) throw error;
      } else {
        await supabase.from('vendor_profiles').update({ approval_status: 'rejected' }).eq('id', vendorId);
      }

      loadDashboardData();
    } catch (error) {
      console.error('Error rejecting vendor:', error);
    }
  }

  async function handleApproveVendorLead(leadId: string) {
    if (!isVendorsSchema()) {
      toast({
        title: 'Not available',
        description: 'Vendor lead approval requires the vendors schema and migration 0034.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const { error } = await supabase.rpc('admin_approve_vendor_lead', { p_lead_id: leadId });
      if (error) throw error;
      toast({ title: 'Approved', description: 'A non-live directory store was created for this ZIP.' });
      loadDashboardData();
    } catch (error: any) {
      console.error('Error approving vendor lead:', error);
      toast({
        title: 'Approve failed',
        description: error?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
  }

  async function markUpgradeRequestSeen(id: string) {
    try {
      const { error } = await supabase.from('vendor_upgrade_requests').update({ status: 'seen' }).eq('id', id);
      if (error) throw error;
      loadDashboardData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Update failed', description: 'Is migration 0039 applied?', variant: 'destructive' });
    }
  }

  async function markReviewReportReviewed(id: string) {
    try {
      const { error } = await supabase.from('review_vendor_reports').update({ status: 'reviewed' }).eq('id', id);
      if (error) throw error;
      loadDashboardData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Update failed', description: 'Is table review_vendor_reports present?', variant: 'destructive' });
    }
  }

  async function handleRejectVendorLead(leadId: string) {
    if (!isVendorsSchema()) {
      toast({
        title: 'Not available',
        description: 'Vendor lead rejection requires the vendors schema and migration 0034.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const { error } = await supabase.rpc('admin_reject_vendor_lead', { p_lead_id: leadId });
      if (error) throw error;
      toast({ title: 'Marked not approved', description: 'This application was rejected.' });
      loadDashboardData();
    } catch (error: any) {
      console.error('Error rejecting vendor lead:', error);
      toast({
        title: 'Reject failed',
        description: error?.message ?? 'Unknown error',
        variant: 'destructive',
      });
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
          <p className="text-gray-400 mb-4">Platform management and moderation</p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-brand-red text-white hover:bg-brand-red-deep border-0"
            >
              <Link href="/admin/vendors">
                Vendor management — find linked owners, search by email/UUID, menus, live, photos, license & hours
              </Link>
            </Button>
            {isVendorsSchema() && (
              <>
                <Button asChild variant="outline" className="border-brand-lime/40 text-brand-lime hover:bg-brand-lime/10">
                  <Link href="/admin/vendor-hub">Vendor hub — switch stores, stats, compare up to 3</Link>
                </Button>
                <Button asChild variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-950/50">
                  <Link href="/admin/dispensaries">Add dispensary / link user</Link>
                </Button>
                <Button asChild variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-950/50">
                  <Link href="/admin/smokers-club">Smokers Club — premium slots 1–9 by market</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-600/50 text-amber-200 hover:bg-amber-950/40"
                  onClick={() => setDashTab('club-banners')}
                >
                  <ImagePlus className="mr-2 h-4 w-4 shrink-0" />
                  Approve homepage banners
                  {stats.pendingHomepageBanners > 0 ? (
                    <Badge className="ml-2 border-amber-500/40 bg-amber-600/25 text-amber-100">
                      {stats.pendingHomepageBanners} pending
                    </Badge>
                  ) : null}
                </Button>
              </>
            )}
            <Button asChild variant="outline" className="border-emerald-600/50 text-emerald-300 hover:bg-emerald-950/40">
              <Link href="/admin/strains">Strain directory — add/edit strains, photos, descriptions</Link>
            </Button>
            <Button asChild variant="outline" className="border-brand-lime/40 text-brand-lime hover:bg-brand-lime/10">
              <Link href="/list-your-business" target="_blank" rel="noopener noreferrer">
                Open public “List your business” form
              </Link>
            </Button>
          </div>
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

        <Tabs value={dashTab} onValueChange={setDashTab} className="space-y-6">
          <TabsList className="flex flex-wrap bg-gray-900 border border-green-900/20">
            <TabsTrigger value="vendors">
              Vendor Approval ({stats.pendingVendors})
            </TabsTrigger>
            <TabsTrigger value="vendor-leads">
              List requests ({stats.pendingVendorLeads})
            </TabsTrigger>
            {isVendorsSchema() && (
              <TabsTrigger value="club-banners">
                Homepage banners ({stats.pendingHomepageBanners})
              </TabsTrigger>
            )}
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="upgrades">
              Upgrade requests ({upgradeRequests.filter((u) => u.status === 'new').length})
            </TabsTrigger>
            <TabsTrigger value="review-reports">
              Review flags ({reviewReports.filter((r) => r.status === 'pending').length})
            </TabsTrigger>
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
                      <h3 className="text-xl font-bold text-white mb-2">
                        {vendor.business_name ?? vendor.name}
                      </h3>
                      <p className="text-gray-400 mb-3">
                        {vendor.description ?? vendor.tagline ?? ''}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="text-white capitalize">{vendor.business_type ?? '—'}</p>
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

          {isVendorsSchema() && (
            <TabsContent value="club-banners" className="space-y-4">
              <p className="text-sm text-gray-500">
                Dispensaries in Smokers Club submit creatives from{' '}
                <span className="text-gray-400">Vendor → Smokers Club</span>. Requires migration{' '}
                <code className="text-green-400/90">0058_smokers_club_homepage_banners</code>.
              </p>
              <AdminSmokersClubBannersPanel onQueueChanged={loadDashboardData} />
            </TabsContent>
          )}

          <TabsContent value="vendor-leads" className="space-y-4">
            {vendorLeads.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
                <ClipboardList className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h3 className="mb-2 text-xl font-bold text-white">No applications yet</h3>
                <p className="text-gray-400">
                  Submissions from the public “List your business” page will show here. If this stays empty, confirm
                  migration <code className="text-green-400/90">0034_vendor_lead_applications</code> is applied on
                  Supabase.
                </p>
              </Card>
            ) : (
              vendorLeads.map((lead) => (
                <Card
                  key={lead.id}
                  className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-white">{lead.business_name}</h3>
                        <Badge
                          variant="outline"
                          className={
                            lead.status === 'pending'
                              ? 'border-yellow-600/50 text-yellow-400'
                              : lead.status === 'approved'
                                ? 'border-green-600/50 text-green-400'
                                : 'border-red-600/50 text-red-400'
                          }
                        >
                          {lead.status === 'pending'
                            ? 'Pending'
                            : lead.status === 'approved'
                              ? 'Approved'
                              : 'Not approved'}
                        </Badge>
                      </div>
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="flex items-start gap-2 text-gray-300">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-lime" />
                          <span>{lead.contact_email}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-300">
                          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-lime" />
                          <span>{lead.contact_phone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-300">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-lime" />
                          <span>ZIP {lead.zip}</span>
                        </div>
                        <div className="text-gray-400">
                          Cannabis license (LIC):{' '}
                          <span className="text-gray-200">
                            {lead.license_number && lead.license_number.trim() !== ''
                              ? lead.license_number
                              : '—'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Submitted {new Date(lead.created_at).toLocaleString()}
                        {lead.status !== 'pending' && lead.reviewed_at
                          ? ` · Reviewed ${new Date(lead.reviewed_at).toLocaleString()}`
                          : ''}
                      </p>
                      {lead.created_vendor_id && (
                        <p className="text-xs text-gray-500">
                          Created vendor id:{' '}
                          <span className="font-mono text-gray-400">{lead.created_vendor_id}</span>
                        </p>
                      )}
                    </div>
                    {lead.status === 'pending' && (
                      <div className="flex shrink-0 flex-col gap-2 md:ml-4">
                        <Button
                          onClick={() => handleApproveVendorLead(lead.id)}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approved
                        </Button>
                        <Button
                          onClick={() => handleRejectVendorLead(lead.id)}
                          variant="outline"
                          className="border-red-900/20 text-red-500 hover:bg-red-500/10"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Not approved
                        </Button>
                      </div>
                    )}
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

          <TabsContent value="upgrades" className="space-y-4">
            {upgradeRequests.length === 0 ? (
              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-12 text-center">
                <Mail className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h3 className="mb-2 text-xl font-bold text-white">No upgrade requests</h3>
                <p className="text-gray-400">
                  Vendors submit these via “Get started” on pricing or sponsored deal CTAs. Requires{' '}
                  <code className="text-green-400/90">vendor_upgrade_requests</code> (migration 0039).
                </p>
              </Card>
            ) : (
              upgradeRequests.map((u) => (
                <Card key={u.id} className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            u.status === 'new'
                              ? 'border-green-500/50 text-green-400'
                              : 'border-gray-600 text-gray-400'
                          }
                        >
                          {u.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{new Date(u.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-lg font-semibold text-white">{u.email}</p>
                      {u.context && <p className="text-gray-300">{u.context}</p>}
                      <p className="text-xs text-gray-500">
                        Vendor id: <span className="font-mono text-gray-400">{u.vendor_id ?? '—'}</span>
                      </p>
                    </div>
                    {u.status === 'new' && (
                      <Button
                        variant="outline"
                        className="shrink-0 border-green-700/50 text-green-400 hover:bg-green-950/50"
                        onClick={() => markUpgradeRequestSeen(u.id)}
                      >
                        Mark seen
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="review-reports" className="space-y-4">
            {reviewReports.length === 0 ? (
              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-12 text-center">
                <Flag className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h3 className="mb-2 text-xl font-bold text-white">No review reports</h3>
                <p className="text-gray-400">
                  Vendors flag reviews from their dashboard. Table <code className="text-green-400/90">review_vendor_reports</code>{' '}
                  is created by migration 0039 when <code className="text-green-400/90">reviews</code> and{' '}
                  <code className="text-green-400/90">vendors</code> exist.
                </p>
              </Card>
            ) : (
              reviewReports.map((r) => (
                <Card key={r.id} className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 text-sm">
                      <Badge variant="outline" className="border-yellow-600/50 text-yellow-400">
                        {r.status}
                      </Badge>
                      <p className="text-gray-300">{r.reason}</p>
                      <p className="text-xs text-gray-500">
                        Review <span className="font-mono text-gray-400">{r.review_id}</span> · Vendor{' '}
                        <span className="font-mono text-gray-400">{r.vendor_id}</span> ·{' '}
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    {r.status === 'pending' && (
                      <Button
                        variant="outline"
                        className="shrink-0 border-green-700/50 text-green-400 hover:bg-green-950/50"
                        onClick={() => markReviewReportReviewed(r.id)}
                      >
                        Mark reviewed
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
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
