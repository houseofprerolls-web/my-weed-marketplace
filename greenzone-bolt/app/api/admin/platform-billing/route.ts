import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

type BillingAccountRow = {
  id: string;
  party_kind: string;
  vendor_id: string | null;
  profile_id: string | null;
  display_label: string | null;
  amount_cents: number;
  due_day_of_month: number;
  invoice_document_url: string | null;
  invoice_storage_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type BillingPeriodRow = {
  id: string;
  account_id: string;
  period_year: number;
  period_month: number;
  due_date: string;
  amount_cents: number;
  paid_at: string | null;
  created_at: string;
};

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anon) {
    return { error: NextResponse.json({ error: 'Server missing Supabase env' }, { status: 500 }) };
  }
  const supabaseAuthed = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabaseAuthed.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (!hasServiceRoleKey()) {
    return {
      error: NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY for admin billing API.' },
        { status: 503 }
      ),
    };
  }
  return { supabaseAuthed, user };
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate && gate.error) return gate.error;

  const db = createServiceRoleClient();

  const { data: accounts, error: accErr } = await db
    .from('platform_billing_accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  const list = (accounts || []) as BillingAccountRow[];
  for (const a of list) {
    const { error: syncErr } = await db.rpc('platform_billing_sync_periods_for_account', {
      p_account_id: a.id,
    });
    if (syncErr) {
      console.warn('platform_billing_sync_periods_for_account', a.id, syncErr.message);
    }
  }

  const { error: refErr } = await db.rpc('platform_billing_refresh_all_vendor_delinquency');
  if (refErr) {
    console.warn('platform_billing_refresh_all_vendor_delinquency', refErr.message);
  }

  const ids = list.map((a) => a.id);
  let periods: BillingPeriodRow[] = [];
  if (ids.length) {
    const { data: perRows, error: perErr } = await db
      .from('platform_billing_periods')
      .select('*')
      .in('account_id', ids)
      .order('due_date', { ascending: false });
    if (perErr) {
      return NextResponse.json({ error: perErr.message }, { status: 500 });
    }
    periods = (perRows || []) as BillingPeriodRow[];
  }

  const vendorIds = list.map((a) => a.vendor_id).filter(Boolean) as string[];
  const profileIds = list.map((a) => a.profile_id).filter(Boolean) as string[];

  const vendorMap = new Map<string, { name: string; slug: string | null; billing_delinquent: boolean }>();
  if (vendorIds.length) {
    const { data: vrows } = await db.from('vendors').select('id,name,slug,billing_delinquent').in('id', vendorIds);
    for (const v of vrows || []) {
      const row = v as {
        id: string;
        name: string;
        slug: string | null;
        billing_delinquent?: boolean | null;
      };
      vendorMap.set(row.id, {
        name: row.name,
        slug: row.slug,
        billing_delinquent: row.billing_delinquent === true,
      });
    }
  }

  const profileMap = new Map<string, { email: string | null }>();
  if (profileIds.length) {
    const { data: prows } = await db.from('profiles').select('id,email').in('id', profileIds);
    for (const p of prows || []) {
      const row = p as { id: string; email: string | null };
      profileMap.set(row.id, { email: row.email });
    }
  }

  const enriched = list.map((a) => ({
    ...a,
    vendor: a.vendor_id ? (vendorMap.get(a.vendor_id) ?? null) : null,
    profile: a.profile_id ? (profileMap.get(a.profile_id) ?? null) : null,
  }));

  return NextResponse.json({ accounts: enriched, periods });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate && gate.error) return gate.error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : null;
  const party_kind = String(body.party_kind || '').trim();
  if (party_kind !== 'vendor' && party_kind !== 'internal_profile') {
    return NextResponse.json({ error: 'party_kind must be vendor or internal_profile' }, { status: 400 });
  }

  const vendor_id =
    party_kind === 'vendor' && typeof body.vendor_id === 'string' && body.vendor_id.trim()
      ? body.vendor_id.trim()
      : null;
  const profile_id =
    party_kind === 'internal_profile' && typeof body.profile_id === 'string' && body.profile_id.trim()
      ? body.profile_id.trim()
      : null;

  if (party_kind === 'vendor' && !vendor_id) {
    return NextResponse.json({ error: 'vendor_id required for vendor party' }, { status: 400 });
  }
  if (party_kind === 'internal_profile' && !profile_id) {
    return NextResponse.json({ error: 'profile_id required for internal_profile party' }, { status: 400 });
  }

  const amount_cents = Number(body.amount_cents);
  const due_day = Number(body.due_day_of_month);
  if (!Number.isFinite(amount_cents) || amount_cents < 0) {
    return NextResponse.json({ error: 'amount_cents must be a non-negative number' }, { status: 400 });
  }
  if (!Number.isFinite(due_day) || due_day < 1 || due_day > 28) {
    return NextResponse.json({ error: 'due_day_of_month must be 1–28' }, { status: 400 });
  }

  const display_label =
    typeof body.display_label === 'string' && body.display_label.trim() ? body.display_label.trim() : null;
  const notes = typeof body.notes === 'string' ? body.notes : null;

  function parseInvoiceDocumentUrl(b: Record<string, unknown>): string | null {
    if (typeof b.invoice_document_url === 'string' && b.invoice_document_url.trim()) {
      return b.invoice_document_url.trim();
    }
    return null;
  }

  function parseInvoiceStoragePath(b: Record<string, unknown>): string | null {
    if (typeof b.invoice_storage_path === 'string' && b.invoice_storage_path.trim()) {
      return b.invoice_storage_path.trim();
    }
    return null;
  }

  const db = createServiceRoleClient();

  const baseRow = {
    party_kind,
    vendor_id: party_kind === 'vendor' ? vendor_id : null,
    profile_id: party_kind === 'internal_profile' ? profile_id : null,
    display_label,
    amount_cents: Math.round(amount_cents),
    due_day_of_month: Math.round(due_day),
    notes,
  };

  if (id) {
    const { data: existing, error: exErr } = await db
      .from('platform_billing_accounts')
      .select('invoice_document_url,invoice_storage_path')
      .eq('id', id)
      .maybeSingle();
    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const ex = existing as { invoice_document_url: string | null; invoice_storage_path: string | null };
    const invoice_document_url = Object.prototype.hasOwnProperty.call(body, 'invoice_document_url')
      ? parseInvoiceDocumentUrl(body)
      : ex.invoice_document_url;
    let invoice_storage_path: string | null;
    if (Object.prototype.hasOwnProperty.call(body, 'invoice_storage_path')) {
      if (body.invoice_storage_path === null) {
        invoice_storage_path = null;
      } else {
        invoice_storage_path = parseInvoiceStoragePath(body);
      }
    } else {
      invoice_storage_path = ex.invoice_storage_path;
    }

    const row = { ...baseRow, invoice_document_url, invoice_storage_path };
    const { data, error } = await db.from('platform_billing_accounts').update(row).eq('id', id).select('id').maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    await db.rpc('platform_billing_sync_periods_for_account', { p_account_id: id });
    await db.rpc('platform_billing_refresh_all_vendor_delinquency');
    return NextResponse.json({ ok: true, id: data.id });
  }

  const row = {
    ...baseRow,
    invoice_document_url: parseInvoiceDocumentUrl(body),
    invoice_storage_path: parseInvoiceStoragePath(body),
  };

  const { data: inserted, error: insErr } = await db.from('platform_billing_accounts').insert(row).select('id').single();
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  const newId = (inserted as { id: string }).id;
  await db.rpc('platform_billing_sync_periods_for_account', { p_account_id: newId });
  await db.rpc('platform_billing_refresh_all_vendor_delinquency');
  return NextResponse.json({ ok: true, id: newId });
}

const INVOICE_BUCKET = 'platform-billing-invoices';

export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate && gate.error) return gate.error;

  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'id query parameter required' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const { data: row, error: selErr } = await db
    .from('platform_billing_accounts')
    .select('id, invoice_storage_path')
    .eq('id', id)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const storagePath = (row as { invoice_storage_path: string | null }).invoice_storage_path;
  if (storagePath?.trim()) {
    const { error: stErr } = await db.storage.from(INVOICE_BUCKET).remove([storagePath.trim()]);
    if (stErr) {
      console.warn('platform_billing delete storage', id, stErr.message);
    }
  }

  const { error: delErr } = await db.from('platform_billing_accounts').delete().eq('id', id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const { error: refErr } = await db.rpc('platform_billing_refresh_all_vendor_delinquency');
  if (refErr) {
    console.warn('platform_billing_refresh_all_vendor_delinquency', refErr.message);
  }

  return NextResponse.json({ ok: true });
}
