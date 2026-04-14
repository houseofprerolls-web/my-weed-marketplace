import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOutreachEmail, outreachEmailConfigured } from '@/lib/outreachEmail';

export const dynamic = 'force-dynamic';

function envTrim(k: string): string {
  return String(process.env[k] ?? '').trim();
}

function supabaseForUser(jwt: string) {
  const url = envTrim('NEXT_PUBLIC_SUPABASE_URL');
  const key = envTrim('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim();
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  let body: { rfqId?: string };
  try {
    body = (await req.json()) as { rfqId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const rfqId = body.rfqId?.trim();
  if (!rfqId) {
    return NextResponse.json({ ok: false, error: 'rfqId required' }, { status: 400 });
  }

  const supabase = supabaseForUser(auth);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
  }

  const { data: rfq, error } = await supabase
    .from('b2b_rfq_requests')
    .select(
      'id,status,buyer_note,created_at,buyer_vendor_id,vendors(name),supply_accounts(name,contact_email,slug),b2b_rfq_line_items(title_snapshot,qty,unit,target_price_cents)'
    )
    .eq('id', rfqId)
    .maybeSingle();

  if (error || !rfq) {
    return NextResponse.json({ ok: false, error: 'RFQ not found or access denied' }, { status: 403 });
  }

  const raw = rfq as Record<string, unknown>;
  const vendorsRaw = raw.vendors as { name: string } | { name: string }[] | null | undefined;
  const supplyRaw = raw.supply_accounts as
    | { name: string; contact_email: string | null; slug: string }
    | { name: string; contact_email: string | null; slug: string }[]
    | null
    | undefined;
  const linesRaw = raw.b2b_rfq_line_items as
    | { title_snapshot: string; qty: number; unit: string; target_price_cents: number | null }[]
    | null
    | undefined;

  const vendorName = Array.isArray(vendorsRaw) ? vendorsRaw[0]?.name : vendorsRaw?.name;
  const supply = Array.isArray(supplyRaw) ? supplyRaw[0] : supplyRaw;
  const to = supply?.contact_email?.trim();
  if (!to || !outreachEmailConfigured()) {
    return NextResponse.json({ ok: true, emailed: false, reason: 'no_recipient_or_email_not_configured' });
  }

  const lines = linesRaw ?? [];
  const linesText = lines
    .map((l) => {
      const tp =
        l.target_price_cents != null ? ` @ $${(l.target_price_cents / 100).toFixed(2)}` : '';
      return `- ${l.title_snapshot} × ${l.qty} ${l.unit}${tp}`;
    })
    .join('\n');

  const rowId = String(raw.id ?? '');
  const buyerNote = (raw.buyer_note as string | null | undefined) ?? null;

  const subject = `New B2B RFQ · ${vendorName ?? 'Vendor'} → ${supply?.name ?? 'you'}`;
  const text = [
    `RFQ id: ${rowId}`,
    `Buyer (shop): ${vendorName ?? '—'}`,
    `Supplier: ${supply?.name ?? '—'}`,
    '',
    'Lines:',
    linesText || '(none)',
    '',
    buyerNote ? `Buyer note:\n${buyerNote}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<pre style="font-family:system-ui,sans-serif">${text.replace(/</g, '&lt;')}</pre>`;

  const sent = await sendOutreachEmail({ to, subject, text, html });
  if (sent.error) {
    return NextResponse.json({ ok: false, emailed: false, error: sent.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, emailed: true });
}
