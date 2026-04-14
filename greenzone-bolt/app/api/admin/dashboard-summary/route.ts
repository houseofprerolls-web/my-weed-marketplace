import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { MARKETING_BANNER_SLIDES_TABLE } from '@/lib/marketingBanners/table';

/**
 * Aggregates admin dashboard metrics using the service role after JWT + admin check.
 * Avoids brittle client-side RLS (e.g. vendor_profiles admin via user_roles only, HEAD counts).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server missing Supabase URL or anon key' }, { status: 500 });
    }

    const supabaseAuthed = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            'Server missing SUPABASE_SERVICE_ROLE_KEY — add it to .env.local so the admin dashboard can load data.',
        },
        { status: 503 }
      );
    }

    const db = createServiceRoleClient();
    const vendorsSchema = resolveUseVendorsTableForDiscovery();

    const warnings: string[] = [];

    let billingOverdueCount = 0;
    let billingDueSoonCount = 0;
    const billRpc = await supabaseAuthed.rpc('admin_platform_billing_dashboard_counts');
    if (billRpc.error) {
      if (!/admin_platform_billing_dashboard_counts|function public\.admin_platform_billing/i.test(billRpc.error.message)) {
        warnings.push(`billing counts: ${billRpc.error.message}`);
      }
    } else if (billRpc.data && typeof billRpc.data === 'object' && !Array.isArray(billRpc.data)) {
      const o = billRpc.data as { overdue?: unknown; due_soon?: unknown };
      billingOverdueCount = Number(o.overdue) || 0;
      billingDueSoonCount = Number(o.due_soon) || 0;
    }

    const profilesRes = await db.from('profiles').select('id', { count: 'exact', head: true });
    if (profilesRes.error) warnings.push(`profiles count: ${profilesRes.error.message}`);

    const vendorsCountRes = vendorsSchema
      ? await db.from('vendors').select('id', { count: 'exact', head: true })
      : await db.from('vendor_profiles').select('id', { count: 'exact', head: true });
    if (vendorsCountRes.error) warnings.push(`vendors count: ${vendorsCountRes.error.message}`);

    const pendingRes = vendorsSchema
      ? await db
          .from('vendors')
          .select('*')
          .in('license_status', ['pending', 'needs_review'])
      : await db.from('vendor_profiles').select('*').eq('approval_status', 'pending');
    if (pendingRes.error) warnings.push(`pending vendors: ${pendingRes.error.message}`);

    const reportsRes = await db
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (reportsRes.error) warnings.push(`reports: ${reportsRes.error.message}`);

    const leadsRes = await db
      .from('vendor_lead_applications')
      .select(
        'id, created_at, business_name, contact_email, contact_phone, zip, license_number, status, reviewed_at, created_vendor_id, contacted_at, requested_delivery, requested_storefront'
      )
      .order('created_at', { ascending: false });
    if (leadsRes.error) warnings.push(`vendor leads: ${leadsRes.error.message}`);

    let pendingHomepageBanners = 0;
    if (vendorsSchema) {
      const banRes = await db
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (banRes.error) {
        warnings.push(`banners: ${banRes.error.message}`);
      } else if (typeof banRes.count === 'number') {
        pendingHomepageBanners = banRes.count;
      }
    }

    const upRes = await db
      .from('vendor_upgrade_requests')
      .select('id, created_at, vendor_id, user_id, email, context, status')
      .order('created_at', { ascending: false })
      .limit(200);
    if (upRes.error) warnings.push(`upgrade requests: ${upRes.error.message}`);

    const rrRes = await db
      .from('review_vendor_reports')
      .select('id, created_at, review_id, vendor_id, reason, status')
      .order('created_at', { ascending: false })
      .limit(200);
    if (rrRes.error) warnings.push(`review reports: ${rrRes.error.message}`);

    const leads = (leadsRes.error ? [] : leadsRes.data) ?? [];
    const pendingLeads = leads.filter((l: { status?: string }) => l.status === 'pending').length;
    const reviewReports = (rrRes.error ? [] : rrRes.data) ?? [];

    type ActivityItem = {
      id: string;
      kind: 'application' | 'vendor' | 'moderation' | 'deal' | 'banner' | 'upgrade';
      title: string;
      subtitle?: string | null;
      createdAt: string;
      severity: 'info' | 'warning';
    };

    const activityFeed: ActivityItem[] = [];

    for (const lead of leads.slice(0, 12) as {
      id: string;
      created_at: string;
      business_name?: string;
      status?: string;
      reviewed_at?: string | null;
    }[]) {
      activityFeed.push({
        id: `lead-${lead.id}`,
        kind: 'application',
        title: lead.status === 'pending' ? 'New application' : 'Application updated',
        subtitle: lead.business_name ?? null,
        createdAt: lead.created_at,
        severity: lead.status === 'pending' ? 'warning' : 'info',
      });
      if (lead.status === 'approved' && lead.reviewed_at) {
        activityFeed.push({
          id: `lead-approved-${lead.id}`,
          kind: 'vendor',
          title: 'Application approved',
          subtitle: lead.business_name ?? null,
          createdAt: lead.reviewed_at,
          severity: 'info',
        });
      }
    }

    for (const r of reviewReports.slice(0, 15) as {
      id: string;
      created_at: string;
      reason?: string;
      status?: string;
    }[]) {
      activityFeed.push({
        id: `review-report-${r.id}`,
        kind: 'moderation',
        title: r.status === 'pending' ? 'Review flagged for moderation' : 'Review report',
        subtitle: r.reason ? String(r.reason).slice(0, 120) : null,
        createdAt: r.created_at,
        severity: r.status === 'pending' ? 'warning' : 'info',
      });
    }

    const upRows = (upRes.error ? [] : upRes.data) ?? [];
    const upgradeSlice = upRows.slice(0, 8) as {
      id: string;
      created_at: string;
      status?: string;
      email?: string;
    }[];
    for (const u of upgradeSlice) {
      if (u.status === 'new') {
        activityFeed.push({
          id: `upgrade-${u.id}`,
          kind: 'upgrade',
          title: 'Upgrade / contact request',
          subtitle: u.email ?? null,
          createdAt: u.created_at,
          severity: 'info',
        });
      }
    }

    if (vendorsSchema) {
      const recentDeals = await db
        .from('deals')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      if (recentDeals.error) {
        warnings.push(`deals activity: ${recentDeals.error.message}`);
      } else {
        for (const d of (recentDeals.data || []) as { id: string; title?: string; created_at: string }[]) {
          activityFeed.push({
            id: `deal-${d.id}`,
            kind: 'deal',
            title: 'Deal created or updated',
            subtitle: d.title ?? null,
            createdAt: d.created_at,
            severity: 'info',
          });
        }
      }

      const recentBanners = await db
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .select('id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(8);
      if (recentBanners.error) {
        warnings.push(`banner activity: ${recentBanners.error.message}`);
      } else {
        for (const b of (recentBanners.data || []) as { id: string; created_at: string; status?: string }[]) {
          activityFeed.push({
            id: `banner-${b.id}`,
            kind: 'banner',
            title:
              b.status === 'pending'
                ? 'Banner pending approval'
                : b.status === 'active'
                  ? 'Banner is live'
                  : 'Banner updated',
            subtitle: null,
            createdAt: b.created_at,
            severity: b.status === 'pending' ? 'warning' : 'info',
          });
        }
      }
    }

    activityFeed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const activityFeedTrimmed = activityFeed.slice(0, 24);

    return NextResponse.json({
      ok: true,
      vendorsSchema,
      stats: {
        totalUsers: profilesRes.error ? 0 : profilesRes.count ?? 0,
        totalVendors: vendorsCountRes.error ? 0 : vendorsCountRes.count ?? 0,
        pendingVendors: pendingRes.error ? 0 : pendingRes.data?.length ?? 0,
        pendingVendorLeads: pendingLeads,
        totalReports: reportsRes.error ? 0 : reportsRes.count ?? 0,
        activeListings: vendorsCountRes.error ? 0 : vendorsCountRes.count ?? 0,
        pendingHomepageBanners,
        billingOverdueCount,
        billingDueSoonCount,
      },
      pendingVendors: pendingRes.error ? [] : pendingRes.data ?? [],
      vendorLeads: leads,
      upgradeRequests: upRes.error ? [] : upRes.data ?? [],
      reviewReports,
      activityFeed: activityFeedTrimmed,
      warnings,
    });
  } catch (e) {
    console.error('GET /api/admin/dashboard-summary', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
