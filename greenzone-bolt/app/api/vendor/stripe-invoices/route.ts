import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

type VendorAuthRow = { id: string; user_id: string | null; stripe_subscription_id: string | null };

function stripeClient(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendorId = request.nextUrl.searchParams.get('vendor_id')?.trim();
    if (!vendorId) {
      return NextResponse.json({ error: 'Missing vendor_id' }, { status: 400 });
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

    if (!hasServiceRoleKey()) {
      return NextResponse.json({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });
    }

    const db = createServiceRoleClient();
    const { data: vRow, error: vErr } = await db
      .from('vendors')
      .select('id,user_id,stripe_subscription_id')
      .eq('id', vendorId)
      .maybeSingle();

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 400 });
    if (!vRow) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    const row = vRow as VendorAuthRow;
    const isAdmin = await requestUserIsAdmin(supabaseAuthed, user);
    const isOwner = row.user_id != null && row.user_id === user.id;

    let isTeam = false;
    if (!isAdmin && !isOwner) {
      const { data: teamRow, error: tErr } = await db
        .from('vendor_team_members')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
      isTeam = Boolean(teamRow?.id);
    }

    if (!isAdmin && !isOwner && !isTeam) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subId = (row.stripe_subscription_id || '').trim();
    if (!subId) {
      return NextResponse.json({ ok: true, invoices: [], note: 'No stripe_subscription_id on vendor yet.' });
    }

    const stripe = stripeClient();
    const sub = await stripe.subscriptions.retrieve(subId);
    const customer =
      typeof sub.customer === 'string' ? sub.customer : (sub.customer && 'id' in sub.customer ? sub.customer.id : null);
    if (!customer) {
      return NextResponse.json({ ok: true, invoices: [], note: 'Stripe subscription has no customer.' });
    }

    const inv = await stripe.invoices.list({
      customer,
      limit: 25,
    });

    const invoices = inv.data.map((i) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      currency: i.currency,
      created: i.created ? new Date(i.created * 1000).toISOString() : null,
      period_start: i.period_start ? new Date(i.period_start * 1000).toISOString() : null,
      period_end: i.period_end ? new Date(i.period_end * 1000).toISOString() : null,
      amount_due: i.amount_due,
      amount_paid: i.amount_paid,
      total: i.total,
      hosted_invoice_url: i.hosted_invoice_url,
      invoice_pdf: i.invoice_pdf,
    }));

    return NextResponse.json({ ok: true, invoices });
  } catch (e) {
    console.error('GET /api/vendor/stripe-invoices', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

