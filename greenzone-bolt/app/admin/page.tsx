"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Store,
  LayoutGrid,
  TrendingUp,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  Flag,
  ClipboardList,
  Mail,
  Phone,
  MapPin,
  UserCog,
} from 'lucide-react';
import { AdminSmokersClubBannersPanel } from '@/components/admin/AdminSmokersClubBannersPanel';
import { AdminFeaturesPanel } from '@/components/admin/AdminFeaturesPanel';
import { AdminJrAdminsPanel } from '@/components/admin/AdminJrAdminsPanel';
import { AdminPriorityQueue } from '@/components/admin/AdminPriorityQueue';
import { AdminSystemFeedback, type AdminActivityItem } from '@/components/admin/AdminSystemFeedback';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  adminVendorPublicServiceModeBadgeClassName,
  adminVendorPublicServiceModeBadges,
} from '@/lib/vendorStorefrontDelivery';

/** Vendor "Upgrade to sponsored" context includes deal id in parentheses (may have extra suffix from UpgradeRequestButton). */
function parseSponsoredDealIdFromContext(context: string | null): string | null {
  if (!context || !context.includes('Sponsored deal / upgrade')) return null;
  const m = context.match(/\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/i);
  return m?.[1] ?? null;
}

/** Postgrest / Supabase client errors expose `message` but are often not `instanceof Error`. */
function supabaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const message = typeof o.message === 'string' ? o.message.trim() : '';
    if (message) return message;
    const details = typeof o.details === 'string' ? o.details.trim() : '';
    if (details) return details;
    const hint = typeof o.hint === 'string' ? o.hint.trim() : '';
    if (hint) return hint;
  }
  return 'Unknown error';
}

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
  contacted_at: string | null;
  requested_delivery?: boolean | null;
  requested_storefront?: boolean | null;
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

const DASH_TABS = new Set([
  'vendors',
  'vendor-leads',
  'features',
  'club-banners',
  'reports',
  'upgrades',
  'review-reports',
  'analytics',
  'jr-admins',
]);

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading } = useAuth();
  const { isAdmin, isMasterAdmin } = useRole();
  const { toast } = useToast();
  const vendorsSchema = useVendorsSchema();
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
  const [activityFeed, setActivityFeed] = useState<AdminActivityItem[]>([]);
  const [pendingVendors, setPendingVendors] = useState<any[]>([]);
  const [vendorLeads, setVendorLeads] = useState<VendorLeadRow[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<VendorUpgradeRequestRow[]>([]);
  const [reviewReports, setReviewReports] = useState<ReviewVendorReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeFeatureRankDraft, setUpgradeFeatureRankDraft] = useState<Record<string, string>>({});
  const [upgradeActionBusyId, setUpgradeActionBusyId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({
          title: 'Sign in required',
          description: 'Sign in again, then reload the admin dashboard.',
          variant: 'destructive',
        });
        return;
      }

      const res = await fetch('/api/admin/dashboard-summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        stats?: typeof stats;
        pendingVendors?: unknown[];
        vendorLeads?: VendorLeadRow[];
        upgradeRequests?: VendorUpgradeRequestRow[];
        reviewReports?: ReviewVendorReportRow[];
        activityFeed?: AdminActivityItem[];
        warnings?: string[];
      };

      if (!res.ok) {
        toast({
          title: 'Admin dashboard could not load',
          description: typeof j.error === 'string' ? j.error : res.statusText,
          variant: 'destructive',
        });
        return;
      }

      if (Array.isArray(j.warnings) && j.warnings.length > 0) {
        toast({
          title: 'Some admin queries failed',
          description: j.warnings.join(' · '),
          variant: 'destructive',
        });
      }

      if (j.stats) {
        setStats(j.stats);
      }
      setPendingVendors(j.pendingVendors || []);
      setVendorLeads((j.vendorLeads || []) as VendorLeadRow[]);
      setUpgradeRequests((j.upgradeRequests || []) as VendorUpgradeRequestRow[]);
      setReviewReports((j.reviewReports || []) as ReviewVendorReportRow[]);
      setActivityFeed(Array.isArray(j.activityFeed) ? j.activityFeed : []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Admin dashboard error',
        description: supabaseErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      void loadDashboardData();
    }
  }, [authLoading, isAdmin, loadDashboardData]);

  useEffect(() => {
    if (!isMasterAdmin && dashTab === 'jr-admins') {
      setDashTab('vendors');
    }
  }, [isMasterAdmin, dashTab]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'billing') {
      router.replace('/admin/billing');
      return;
    }
    if (t && DASH_TABS.has(t)) {
      if (t === 'jr-admins' && !isMasterAdmin) return;
      setDashTab(t);
    }
  }, [searchParams, isMasterAdmin, router]);

  const onDashTabChange = useCallback(
    (value: string) => {
      setDashTab(value);
      router.replace(value === 'vendors' ? '/admin' : `/admin?tab=${encodeURIComponent(value)}`, { scroll: false });
    },
    [router]
  );

  async function handleApproveVendor(vendorId: string) {
    try {
      if (vendorsSchema) {
        const { error } = await supabase.rpc('admin_approve_vendor', { p_vendor_id: vendorId });
        if (error) throw error;
        await logAdminAuditEvent(supabase, {
          actionKey: 'vendor.approve',
          summary: `Approved vendor ${vendorId}`,
          resourceType: 'vendor',
          resourceId: vendorId,
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('vendor_profiles')
          .update({
            is_approved: true,
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.id,
          })
          .eq('id', vendorId);
        if (error) throw error;
        await logAdminAuditEvent(supabase, {
          actionKey: 'vendor.approve',
          summary: `Approved vendor ${vendorId}`,
          resourceType: 'vendor_profiles',
          resourceId: vendorId,
        });
      }

      loadDashboardData();
    } catch (error) {
      console.error('Error approving vendor:', error);
    }
  }

  async function handleRejectVendor(vendorId: string) {
    try {
      if (vendorsSchema) {
        const { error } = await supabase.rpc('admin_reject_vendor', { p_vendor_id: vendorId });
        if (error) throw error;
        await logAdminAuditEvent(supabase, {
          actionKey: 'vendor.reject',
          summary: `Rejected vendor ${vendorId}`,
          resourceType: 'vendor',
          resourceId: vendorId,
        });
      } else {
        const { error } = await supabase.from('vendor_profiles').update({ approval_status: 'rejected' }).eq('id', vendorId);
        if (error) throw error;
        await logAdminAuditEvent(supabase, {
          actionKey: 'vendor.reject',
          summary: `Rejected vendor ${vendorId}`,
          resourceType: 'vendor_profiles',
          resourceId: vendorId,
        });
      }

      loadDashboardData();
    } catch (error) {
      console.error('Error rejecting vendor:', error);
    }
  }

  async function handleApproveVendorLead(leadId: string) {
    if (!vendorsSchema) {
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
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor_lead.approve',
        summary: `Approved vendor lead ${leadId}`,
        resourceType: 'vendor_lead',
        resourceId: leadId,
      });
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
      const { error } = await supabase.rpc('admin_set_vendor_upgrade_request_status', {
        p_id: id,
        p_status: 'seen',
      });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor_upgrade_request.seen',
        summary: `Marked vendor upgrade request ${id} as seen`,
        resourceType: 'vendor_upgrade_request',
        resourceId: id,
      });
      toast({ title: 'Marked seen' });
      loadDashboardData();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Update failed',
        description: supabaseErrorMessage(e),
        variant: 'destructive',
      });
    }
  }

  async function markUpgradeRequestClosed(id: string) {
    try {
      setUpgradeActionBusyId(id);
      const { error } = await supabase.rpc('admin_set_vendor_upgrade_request_status', {
        p_id: id,
        p_status: 'closed',
      });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor_upgrade_request.closed',
        summary: `Closed vendor upgrade request ${id}`,
        resourceType: 'vendor_upgrade_request',
        resourceId: id,
      });
      toast({ title: 'Request dismissed' });
      loadDashboardData();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Update failed',
        description: supabaseErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      setUpgradeActionBusyId(null);
    }
  }

  async function approveFeaturedDealFromUpgradeRequest(req: VendorUpgradeRequestRow) {
    const dealId = parseSponsoredDealIdFromContext(req.context);
    if (!dealId) {
      toast({
        title: 'No deal linked',
        description: 'This request does not include a sponsored-deal id. Use Marketplace deals to pin manually.',
        variant: 'destructive',
      });
      return;
    }
    const raw = (upgradeFeatureRankDraft[req.id] ?? '5').trim();
    const rank = parseInt(raw, 10);
    if (!Number.isFinite(rank) || rank < 1 || rank > 99) {
      toast({ title: 'Invalid rank', description: 'Enter a featured rank from 1 (first) to 99.', variant: 'destructive' });
      return;
    }
    try {
      setUpgradeActionBusyId(req.id);
      const { error: rpcErr } = await supabase.rpc('admin_set_deal_marketplace_featured_rank', {
        p_deal_id: dealId,
        p_rank: rank,
      });
      if (rpcErr) throw rpcErr;
      const { error: updErr } = await supabase.rpc('admin_set_vendor_upgrade_request_status', {
        p_id: req.id,
        p_status: 'approved',
      });
      if (updErr) throw updErr;
      await logAdminAuditEvent(supabase, {
        actionKey: 'deal.marketplace_featured_from_upgrade',
        summary: `Featured deal ${dealId} at rank ${rank} (upgrade request ${req.id})`,
        resourceType: 'deal',
        resourceId: dealId,
        metadata: { upgrade_request_id: req.id, rank },
      });
      toast({
        title: 'Deal approved for featuring',
        description: `Pinned at rank ${rank} on the public deals carousel. Adjust anytime under Marketplace deals.`,
      });
      loadDashboardData();
    } catch (e: unknown) {
      const msg = supabaseErrorMessage(e);
      console.error(e);
      const hint =
        /vendor_upgrade_requests_status_check|violates check constraint/i.test(msg)
          ? ' Run migration 0153_vendor_upgrade_requests_approved_status on Supabase if status approved is not allowed.'
          : /row-level security|42501/i.test(msg)
            ? ' Apply migration 0154_admin_vendor_upgrade_request_status_rpc.sql on Supabase.'
            : '';
      toast({
        title: 'Could not approve',
        description:
          msg.toLowerCase().includes('deal not found')
            ? 'Deal may have been deleted.'
            : msg + hint,
        variant: 'destructive',
      });
    } finally {
      setUpgradeActionBusyId(null);
    }
  }

  async function markReviewReportReviewed(id: string) {
    try {
      const { error } = await supabase.from('review_vendor_reports').update({ status: 'reviewed' }).eq('id', id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'review_vendor_report.reviewed',
        summary: `Marked review vendor report ${id} reviewed`,
        resourceType: 'review_vendor_report',
        resourceId: id,
      });
      loadDashboardData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Update failed', description: 'Is table review_vendor_reports present?', variant: 'destructive' });
    }
  }

  async function handleRejectVendorLead(leadId: string) {
    if (!vendorsSchema) {
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
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor_lead.reject',
        summary: `Rejected vendor lead ${leadId}`,
        resourceType: 'vendor_lead',
        resourceId: leadId,
      });
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

  async function handleMarkVendorLeadContacted(leadId: string) {
    try {
      const { error } = await supabase
        .from('vendor_lead_applications')
        .update({ contacted_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor_lead.contacted',
        summary: `Logged contact for vendor lead ${leadId}`,
        resourceType: 'vendor_lead_application',
        resourceId: leadId,
      });
      toast({ title: 'Contact logged', description: 'Timestamp saved on this lead.' });
      loadDashboardData();
    } catch (error: unknown) {
      const msg = supabaseErrorMessage(error);
      console.error('Error marking lead contacted:', error);
      toast({
        title: 'Could not update lead',
        description: msg.includes('contacted_at') ? 'Apply migration 0107_vendor_lead_contacted_at on Supabase.' : msg,
        variant: 'destructive',
      });
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="bg-gradient-to-br from-gray-900 to-black border-red-900/20 p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You do not have permission to access this page</p>
        </Card>
      </div>
    );
  }

  const pendingVendorQueue = stats.pendingVendors + stats.pendingVendorLeads;
  const pendingReviewFlags = reviewReports.filter((r) => r.status === 'pending').length;
  const reportsToModerateCount = stats.totalReports + pendingReviewFlags;
  const unreadWarnings = reportsToModerateCount;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Priority work, activity, and workflows. Use the sidebar for Vendors, Marketplace, Catalog, and Settings.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
        <AdminPriorityQueue
          pendingVendorCount={pendingVendorQueue}
          reportsToModerateCount={reportsToModerateCount}
          pendingBannerCount={stats.pendingHomepageBanners}
          vendorsSchema={vendorsSchema}
        />

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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

        <Tabs value={dashTab} onValueChange={onDashTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap bg-gray-900 border border-green-900/20">
            <TabsTrigger value="vendors">
              Vendor approval ({stats.pendingVendors})
            </TabsTrigger>
            <TabsTrigger value="vendor-leads">
              Applications ({stats.pendingVendorLeads})
            </TabsTrigger>
            {vendorsSchema && (
              <>
                <TabsTrigger value="features" className="gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  Feature slots
                </TabsTrigger>
                <TabsTrigger value="club-banners">
                  Ad slideshows ({stats.pendingHomepageBanners})
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="upgrades">
              Upgrade requests ({upgradeRequests.filter((u) => u.status === 'new').length})
            </TabsTrigger>
            <TabsTrigger value="review-reports">
              Review flags ({reviewReports.filter((r) => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            {isMasterAdmin && (
              <TabsTrigger value="jr-admins" className="gap-1.5">
                <UserCog className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                Junior admins
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            {pendingVendors.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">All caught up</h3>
                <p className="text-gray-400 mb-4">No pending vendor rows in the directory.</p>
                <p className="text-sm text-gray-500 max-w-lg mx-auto">
                  New businesses apply via <span className="text-gray-300">List your business</span> or{' '}
                  <span className="text-gray-300">Pricing</span> — those submissions land under the{' '}
                  <span className="text-gray-300">Applications</span> tab. When you approve an application there, a
                  pending vendor is created and shows up here for final approve / reject.
                </p>
              </Card>
            ) : (
              pendingVendors.map((vendor) => (
                <Card key={vendor.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {vendor.business_name ?? vendor.name}
                      </h3>
                      {vendorsSchema ? (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {adminVendorPublicServiceModeBadges({
                            address: vendor.address as string | null | undefined,
                            city: vendor.city as string | null | undefined,
                            state: vendor.state as string | null | undefined,
                            zip: vendor.zip as string | null | undefined,
                            admin_service_mode: vendor.admin_service_mode as string | null | undefined,
                            allow_both_storefront_and_delivery: vendor.allow_both_storefront_and_delivery as
                              | boolean
                              | null
                              | undefined,
                            service_mode_locked: vendor.service_mode_locked as boolean | null | undefined,
                          }).map((b, i) => (
                            <Badge
                              key={`${vendor.id}-svc-${i}`}
                              variant="outline"
                              className={`text-[10px] font-medium ${adminVendorPublicServiceModeBadgeClassName(b.variant)}`}
                            >
                              {b.label}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
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

          {vendorsSchema && (
            <TabsContent value="features" className="space-y-4">
              <AdminFeaturesPanel showHelpLink />
            </TabsContent>
          )}

          {vendorsSchema && (
            <TabsContent value="club-banners" className="min-w-0 space-y-4 overflow-visible">
              <p className="text-sm text-gray-500">
                Dispensaries in Smokers Club submit creatives from{' '}
                <span className="text-gray-400">Vendor → Smokers Club</span>. Requires migration{' '}
                <code className="text-green-400/90">0167_marketing_banner_slides</code> (table{' '}
                <code className="text-green-400/90">marketing_banner_slides</code>).
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
                  migration <code className="text-green-400/90">0034_vendor_lead_applications</code> (and{' '}
                  <code className="text-green-400/90">0196_vendor_lead_service_prefs_and_service_mode_lock</code> for
                  lane preferences) is applied on Supabase.
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
                        {lead.contacted_at ? (
                          <Badge variant="outline" className="border-sky-600/50 text-sky-300">
                            Contacted {new Date(lead.contacted_at).toLocaleDateString()}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-zinc-600 text-zinc-500">
                            Not contacted
                          </Badge>
                        )}
                        {(lead.requested_delivery ?? true) || lead.requested_storefront ? (
                          <>
                            {(lead.requested_delivery ?? true) ? (
                              <Badge variant="outline" className="border-emerald-700/50 text-emerald-200">
                                Wants delivery
                              </Badge>
                            ) : null}
                            {lead.requested_storefront ? (
                              <Badge variant="outline" className="border-amber-700/50 text-amber-200">
                                Wants storefront
                              </Badge>
                            ) : null}
                          </>
                        ) : null}
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
                    <div className="flex shrink-0 flex-col gap-2 md:ml-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-sky-700/40 text-sky-200 hover:bg-sky-950/40"
                        onClick={() => void handleMarkVendorLeadContacted(lead.id)}
                      >
                        Log contact (outreach)
                      </Button>
                      {lead.status === 'pending' ? (
                        <>
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
                        </>
                      ) : null}
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

          <TabsContent value="upgrades" className="space-y-4">
            {upgradeRequests.length === 0 ? (
              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-12 text-center">
                <Mail className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h3 className="mb-2 text-xl font-bold text-white">No upgrade requests</h3>
                <p className="text-gray-400">
                  Logged-in vendors submit these from their dashboard (e.g. upgrade / feature requests). Sponsored-deal
                  requests can be <span className="text-gray-300">approved &amp; pinned</span> to the /deals carousel here.
                  Full manual control:{' '}
                  <Link href="/admin/marketplace-deals" className="text-green-400 underline hover:text-green-300">
                    Marketplace deals
                  </Link>
                  . Requires <code className="text-green-400/90">vendor_upgrade_requests</code> and migration{' '}
                  <code className="text-green-400/90">0153</code> for <code className="text-green-400/90">approved</code>{' '}
                  status.
                </p>
              </Card>
            ) : (
              upgradeRequests.map((u) => {
                const dealId = parseSponsoredDealIdFromContext(u.context);
                const canPinDeal =
                  Boolean(dealId) && u.status !== 'approved' && u.status !== 'closed';
                const busy = upgradeActionBusyId === u.id;
                return (
                  <Card key={u.id} className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              u.status === 'new'
                                ? 'border-green-500/50 text-green-400'
                                : u.status === 'approved'
                                  ? 'border-emerald-500/50 text-emerald-300'
                                  : u.status === 'closed'
                                    ? 'border-zinc-600 text-zinc-500'
                                    : 'border-gray-600 text-gray-400'
                            }
                          >
                            {u.status}
                          </Badge>
                          <span className="text-xs text-gray-500">{new Date(u.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-lg font-semibold text-white">{u.email}</p>
                        {u.context && <p className="break-words text-gray-300">{u.context}</p>}
                        {dealId ? (
                          <p className="text-xs text-violet-300/90">
                            Linked deal id:{' '}
                            <span className="font-mono text-violet-200/90">{dealId}</span>
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-500">
                          Vendor id: <span className="font-mono text-gray-400">{u.vendor_id ?? '—'}</span>
                        </p>
                        {u.status === 'approved' ? (
                          <p className="text-xs text-emerald-400/90">
                            Featured on /deals — change rank anytime in{' '}
                            <Link href="/admin/marketplace-deals" className="underline hover:text-emerald-300">
                              Marketplace deals
                            </Link>
                            .
                          </p>
                        ) : null}
                      </div>
                      <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:min-w-[220px]">
                        {canPinDeal ? (
                          <div className="rounded-lg border border-purple-500/25 bg-purple-950/20 p-3">
                            <Label className="text-xs text-purple-200/90">Deals carousel rank (1 = first)</Label>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Input
                                className="h-9 w-20 border-purple-800/50 bg-black/40 text-white"
                                value={upgradeFeatureRankDraft[u.id] ?? '5'}
                                onChange={(e) =>
                                  setUpgradeFeatureRankDraft((prev) => ({ ...prev, [u.id]: e.target.value }))
                                }
                                inputMode="numeric"
                                disabled={busy}
                                aria-label="Featured rank for deals carousel"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="bg-purple-600 text-white hover:bg-purple-700"
                                disabled={busy}
                                onClick={() => void approveFeaturedDealFromUpgradeRequest(u)}
                              >
                                Approve &amp; feature
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          {u.status === 'new' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-green-700/50 text-green-400 hover:bg-green-950/50"
                              disabled={busy}
                              onClick={() => markUpgradeRequestSeen(u.id)}
                            >
                              Mark seen
                            </Button>
                          ) : null}
                          {u.status !== 'approved' && u.status !== 'closed' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm('Dismiss this request without featuring a deal?')) {
                                  void markUpgradeRequestClosed(u.id);
                                }
                              }}
                            >
                              Dismiss
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
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

          {isMasterAdmin && (
            <TabsContent value="jr-admins" className="space-y-4">
              <AdminJrAdminsPanel />
            </TabsContent>
          )}
        </Tabs>
          </div>

          <div className="mt-8 max-w-full overflow-x-hidden lg:mt-0 lg:sticky lg:top-4 lg:self-start lg:bg-zinc-950">
            <AdminSystemFeedback activityFeed={activityFeed} unreadWarnings={unreadWarnings} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-zinc-950">
          <p className="text-zinc-400">Loading admin…</p>
        </div>
      }
    >
      <AdminDashboardInner />
    </Suspense>
  );
}
