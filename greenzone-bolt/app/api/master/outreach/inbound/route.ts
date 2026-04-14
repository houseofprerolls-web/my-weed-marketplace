import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function headerMapFromPostmark(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(headers)) return out;
  for (const h of headers) {
    if (!h || typeof h !== 'object') continue;
    const name = String((h as { Name?: string }).Name || '').trim();
    const value = String((h as { Value?: string }).Value || '').trim();
    if (name) out[name.toLowerCase()] = value;
  }
  return out;
}

function extractInReplyToFromString(raw: string): string[] {
  const out: string[] = [];
  const re = /<([^>\s]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1].trim());
  }
  if (out.length === 0 && raw.trim()) {
    out.push(raw.replace(/^<|>$/g, '').trim());
  }
  return out.filter(Boolean);
}

type GenericInbound = {
  InReplyTo?: string;
  In_Reply_To?: string;
  TextBody?: string;
  HtmlBody?: string;
  From?: string;
  FromFull?: { Email?: string };
  Headers?: unknown;
};

async function findSendForRefs(
  supabase: ReturnType<typeof createServiceRoleClient>,
  refs: string[]
): Promise<{ id: string; contact_id: string } | null> {
  for (const ref of refs) {
    if (!ref) continue;
    const cleaned = ref.replace(/^<|>$/g, '').trim();
    const localPart = cleaned.includes('@') ? cleaned.split('@')[0] : cleaned;
    for (const candidate of [ref, cleaned, localPart]) {
      if (!candidate) continue;
      const { data } = await supabase
        .from('outreach_sends')
        .select('id,contact_id')
        .eq('provider_message_id', candidate)
        .maybeSingle();
      if (data) return data;
    }
    if (/^[0-9a-f-]{36}$/i.test(ref)) {
      const { data: byToken } = await supabase
        .from('outreach_sends')
        .select('id,contact_id')
        .eq('outbound_token', ref)
        .maybeSingle();
      if (byToken) return byToken;
    }
  }
  return null;
}

/**
 * Inbound reply webhook. Secure with OUTREACH_INBOUND_WEBHOOK_SECRET (header x-outreach-webhook-secret).
 * Accepts JSON: Postmark-style { Headers, TextBody, From } or { InReplyTo, TextBody, From }.
 */
export async function POST(request: NextRequest) {
  const secret = (process.env.OUTREACH_INBOUND_WEBHOOK_SECRET || '').trim();
  if (secret) {
    const got = request.headers.get('x-outreach-webhook-secret') || '';
    if (got !== secret) {
      return jsonError(403, 'Forbidden');
    }
  }

  if (!hasServiceRoleKey()) {
    return jsonError(503, 'Service role not configured');
  }

  let payload: GenericInbound;
  try {
    payload = (await request.json()) as GenericInbound;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const headerMap = headerMapFromPostmark(payload.Headers);
  const inReplyRaw =
    payload.InReplyTo ||
    payload.In_Reply_To ||
    headerMap['in-reply-to'] ||
    headerMap['in_reply_to'] ||
    '';
  const refs = extractInReplyToFromString(String(inReplyRaw || ''));
  const fromEmail =
    typeof payload.From === 'string'
      ? payload.From
      : typeof payload.FromFull?.Email === 'string'
        ? payload.FromFull.Email
        : '';

  const snippet = (payload.TextBody || payload.HtmlBody || '').toString().slice(0, 2000);

  if (refs.length === 0) {
    return jsonError(400, 'Could not parse In-Reply-To / References');
  }

  try {
    const supabase = createServiceRoleClient();
    const sendRow = await findSendForRefs(supabase, refs);
    if (!sendRow) {
      return jsonError(404, 'No matching outreach send for In-Reply-To');
    }

    const { data: contact } = await supabase
      .from('outreach_contacts')
      .select('id,status,notes')
      .eq('id', sendRow.contact_id)
      .maybeSingle();
    if (!contact) {
      return jsonError(404, 'Contact missing');
    }

    const noteLine = `[Inbound ${new Date().toISOString()} from ${fromEmail || '?'}] ${snippet.replace(/\s+/g, ' ').trim()}`.slice(
      0,
      4000
    );
    const prevNotes = typeof contact.notes === 'string' ? contact.notes.trim() : '';
    const newNotes = prevNotes ? `${prevNotes}\n\n${noteLine}` : noteLine;

    const { error: upErr } = await supabase
      .from('outreach_contacts')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        notes: newNotes,
      })
      .eq('id', sendRow.contact_id);

    if (upErr) {
      return jsonError(500, upErr.message);
    }

    return NextResponse.json({ ok: true, contact_id: sendRow.contact_id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Inbound failed';
    return jsonError(500, msg);
  }
}
