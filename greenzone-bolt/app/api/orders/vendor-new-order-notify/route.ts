import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOutreachEmail, outreachEmailConfigured } from '@/lib/outreachEmail';
import { getSiteUrl } from '@/lib/siteUrl';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

export const dynamic = 'force-dynamic';

function envTrim(k: string): string {
  return String(process.env[k] ?? '').trim();
}

function supabaseForUserJwt(jwt: string) {
  const url = envTrim('NEXT_PUBLIC_SUPABASE_URL');
  const key = envTrim('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeEmails(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of raw) {
    const t = String(e ?? '').trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim();
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = (await req.json()) as { orderId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'orderId required' }, { status: 400 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { ok: false, error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' },
      { status: 503 }
    );
  }

  const userClient = supabaseForUserJwt(auth);
  if (!userClient) {
    return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
  }

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select(
      'id,consumer_id,vendor_id,order_number,status,total_cents,vendor_new_order_notified_at,pickup_or_delivery'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }

  const consumerId = order.consumer_id as string | null;
  if (!consumerId || consumerId !== user.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  if (order.vendor_new_order_notified_at) {
    return NextResponse.json({ ok: true, skipped: 'already_notified' });
  }

  const vendorId = order.vendor_id as string;
  const { data: vendor, error: vErr } = await admin
    .from('vendors')
    .select('id,name,order_notification_emails,user_id')
    .eq('id', vendorId)
    .maybeSingle();

  if (vErr || !vendor) {
    return NextResponse.json({ ok: false, error: 'Vendor not found' }, { status: 404 });
  }

  const vendorName = (vendor.name as string | null)?.trim() || 'Your shop';
  const notifyEmails = normalizeEmails(vendor.order_notification_emails as string[] | null);
  const orderNumber =
    (order.order_number as string | null)?.trim() ||
    (order.id as string).slice(0, 8).toUpperCase();
  const totalCents = Number(order.total_cents ?? 0);
  const totalStr = Number.isFinite(totalCents) ? `$${(totalCents / 100).toFixed(2)}` : '—';
  const fulfillment = String(order.pickup_or_delivery ?? '').trim() || '—';
  const site = getSiteUrl();
  const manageUrl = `${site}/vendor/orders/${orderId}`;

  const subject = `New order ${orderNumber} · ${vendorName}`;
  const text = [
    `You have a new marketplace order.`,
    ``,
    `Shop: ${vendorName}`,
    `Order: ${orderNumber}`,
    `Total: ${totalStr}`,
    `Fulfillment: ${fulfillment}`,
    ``,
    `Open in dashboard:`,
    manageUrl,
    ``,
    `This message was sent because this address is listed under your shop’s order alert emails.`,
  ].join('\n');

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p><strong>New order</strong> for <strong>${escapeHtml(vendorName)}</strong></p>
  <p>Order <strong>${escapeHtml(orderNumber)}</strong> · Total <strong>${escapeHtml(totalStr)}</strong><br/>
  Fulfillment: ${escapeHtml(fulfillment)}</p>
  <p><a href="${escapeAttr(manageUrl)}">View order in vendor dashboard</a></p>
</div>`;

  if (!outreachEmailConfigured()) {
    await admin.from('orders').update({ vendor_new_order_notified_at: new Date().toISOString() }).eq('id', orderId);
    return NextResponse.json({ ok: true, emailed: false, reason: 'outreach_not_configured' });
  }

  if (notifyEmails.length === 0) {
    await admin.from('orders').update({ vendor_new_order_notified_at: new Date().toISOString() }).eq('id', orderId);
    return NextResponse.json({ ok: true, emailed: false, reason: 'no_notification_emails' });
  }

  for (const to of notifyEmails) {
    const sent = await sendOutreachEmail({ to, subject, text, html });
    if (sent.error) {
      return NextResponse.json(
        { ok: false, emailed: false, error: sent.error, failedRecipient: to },
        { status: 502 }
      );
    }
  }

  const { error: stampErr } = await admin
    .from('orders')
    .update({ vendor_new_order_notified_at: new Date().toISOString() })
    .eq('id', orderId);

  if (stampErr) {
    return NextResponse.json({ ok: false, error: stampErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, emailed: true, recipients: notifyEmails.length });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
