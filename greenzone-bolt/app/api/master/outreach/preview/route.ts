import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireMasterOutreachAuth } from '@/lib/masterOutreachRequest';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { composeOutreachMessage, type OutreachComposeDraft } from '@/lib/outreachCompose';
import { getSiteUrl } from '@/lib/siteUrl';

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type PreviewBody = {
  contact_id?: string | null;
  draft_subject?: string | null;
  draft_html?: string | null;
  draft_text?: string | null;
  /** When true, response includes `built_in` — same merge row, empty draft (server default + env bodies). */
  compare_builtin?: boolean;
};

export async function POST(request: NextRequest) {
  const auth = await requireMasterOutreachAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasServiceRoleKey()) {
    return jsonError(503, 'Service role not configured');
  }

  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const siteUrl = getSiteUrl();
  const draft: OutreachComposeDraft | null = {
    subject: body.draft_subject,
    html: body.draft_html,
    text: body.draft_text,
  };

  const contactId = typeof body.contact_id === 'string' ? body.contact_id.trim() : '';
  if (contactId) {
    const supabase = createServiceRoleClient();
    const { data: row, error } = await supabase
      .from('outreach_contacts')
      .select('id,email,person_name,company_name,phone,uls_premise_kind')
      .eq('id', contactId)
      .maybeSingle();
    if (error) {
      return jsonError(500, error.message);
    }
    if (!row) {
      return jsonError(404, 'Contact not found');
    }
    const out = composeOutreachMessage(row, siteUrl, draft);
    if (body.compare_builtin) {
      const built_in = composeOutreachMessage(row, siteUrl, null);
      return NextResponse.json({ ...out, built_in });
    }
    return NextResponse.json(out);
  }

  const dummy = {
    id: randomUUID(),
    email: 'owner@example-dispensary.com',
    person_name: 'Alex Rivera',
    company_name: 'Sample Retail Collective LLC',
    phone: '(555) 010-0199',
    uls_premise_kind: 'storefront' as string | null,
  };
  const out = composeOutreachMessage(dummy, siteUrl, draft);
  if (body.compare_builtin) {
    const built_in = composeOutreachMessage(dummy, siteUrl, null);
    return NextResponse.json({ ...out, built_in, sample: true });
  }
  return NextResponse.json({ ...out, sample: true });
}
