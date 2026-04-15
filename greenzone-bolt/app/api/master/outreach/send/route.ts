import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireMasterOutreachAuth } from '@/lib/masterOutreachRequest';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { sendOutreachEmail, outreachEmailConfigured } from '@/lib/outreachEmail';
import { resolveAllowedOutreachFrom } from '@/lib/outreachFromOptions';
import { OUTREACH_TEMPLATE_KEY_DEFAULT } from '@/lib/outreachTemplate';
import { composeOutreachMessage } from '@/lib/outreachCompose';
import { buildOutreachUnsubscribeUrl } from '@/lib/outreachUnsubscribe';
import { getSiteUrl } from '@/lib/siteUrl';

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

const BLOCKED_SEND = new Set(['unsubscribed', 'no_send', 'archived', 'bounced']);

type SendBody = {
  contact_ids?: string[];
  max_batch?: number;
  from_id?: string;
  /** When true (default), optional draft_* fields are applied the same way as preview (merge tokens, HTML↔text fill-in). */
  use_template_draft?: boolean;
  draft_subject?: string | null;
  draft_html?: string | null;
  draft_text?: string | null;
};

export async function POST(request: NextRequest) {
  const authResult = await requireMasterOutreachAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  if (!hasServiceRoleKey()) {
    return jsonError(503, 'Service role not configured');
  }
  if (!outreachEmailConfigured()) {
    return jsonError(
      503,
      'Email not configured: set RESEND_API_KEY (or OUTREACH_RESEND_API_KEY) and optionally OUTREACH_EMAIL_FROM — or set OUTREACH_EMAIL_FROM plus SMTP (OUTREACH_SMTP_*) or OUTREACH_EMAIL_TRANSPORT=smtp to force mailbox send'
    );
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const fromResolved = resolveAllowedOutreachFrom(body.from_id);
  if ('error' in fromResolved) {
    return jsonError(400, fromResolved.error);
  }
  const outboundFrom = fromResolved.from;

  const useDraft = body.use_template_draft !== false;
  const sendDraft = useDraft
    ? {
        subject: body.draft_subject ?? null,
        html: body.draft_html ?? null,
        text: body.draft_text ?? null,
      }
    : null;

  const ids = Array.isArray(body.contact_ids) ? body.contact_ids.filter((x) => typeof x === 'string') : [];
  if (ids.length === 0) {
    return jsonError(400, 'contact_ids[] required');
  }

  const maxBatch = Math.min(50, Math.max(1, body.max_batch ?? 25));
  const slice = ids.slice(0, maxBatch);

  const supabase = createServiceRoleClient();
  const siteUrl = getSiteUrl();

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const contactId of slice) {
    const { data: row, error: fetchErr } = await supabase
      .from('outreach_contacts')
      .select('id,email,person_name,company_name,phone,uls_premise_kind,status')
      .eq('id', contactId)
      .maybeSingle();

    if (fetchErr || !row) {
      results.push({ id: contactId, ok: false, error: 'Contact not found' });
      continue;
    }
    if (BLOCKED_SEND.has(row.status)) {
      results.push({ id: contactId, ok: false, error: `Blocked status: ${row.status}` });
      continue;
    }

    const { subject, html, text } = composeOutreachMessage(row, siteUrl, sendDraft);
    const unsubUrl = buildOutreachUnsubscribeUrl(siteUrl, row.id);

    const outboundToken = randomUUID();
    const headers: Record<string, string> = {
      'X-Outreach-Token': outboundToken,
      'List-Unsubscribe': `<${unsubUrl}>`,
    };

    const sendResult = await sendOutreachEmail({
      to: row.email,
      from: outboundFrom,
      subject,
      html,
      text,
      headers,
    });

    const { error: insErr } = await supabase.from('outreach_sends').insert({
      contact_id: row.id,
      provider_message_id: sendResult.providerMessageId,
      outbound_token: outboundToken,
      template_key: OUTREACH_TEMPLATE_KEY_DEFAULT,
      subject_snapshot: subject,
      sent_by_user_id: user.id,
      error: sendResult.error ?? null,
    });

    if (insErr) {
      results.push({ id: contactId, ok: false, error: insErr.message });
      continue;
    }

    if (sendResult.error) {
      results.push({ id: contactId, ok: false, error: sendResult.error });
      continue;
    }

    const { error: upErr } = await supabase
      .from('outreach_contacts')
      .update({
        status: 'sent',
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (upErr) {
      results.push({ id: contactId, ok: false, error: upErr.message });
      continue;
    }

    results.push({ id: contactId, ok: true });
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    sent_ok: okCount,
    attempted: results.length,
    truncated_from_request: ids.length - slice.length,
    results,
  });
}
