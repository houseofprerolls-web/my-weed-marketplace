import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { outreachUnsubscribeSecret, verifyOutreachContactSignature } from '@/lib/outreachUnsubscribe';

/**
 * Public one-click unsubscribe (no login). Optional HMAC when OUTREACH_UNSUBSCRIBE_SECRET is set.
 */
export async function GET(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    return new NextResponse('Service unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }

  const { searchParams } = new URL(request.url);
  const c = searchParams.get('c')?.trim() || '';
  const s = searchParams.get('s')?.trim() || '';

  if (!c || !/^[0-9a-f-]{36}$/i.test(c)) {
    return new NextResponse('Invalid link', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  const needSig = Boolean(outreachUnsubscribeSecret());
  if (needSig && (!s || !verifyOutreachContactSignature(c, s))) {
    return new NextResponse('Invalid or missing signature', { status: 403, headers: { 'Content-Type': 'text/plain' } });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: prev, error: readErr } = await supabase
      .from('outreach_contacts')
      .select('id,notes')
      .eq('id', c)
      .maybeSingle();
    if (readErr || !prev) {
      return new NextResponse(readErr ? 'Could not read' : 'Unknown contact', {
        status: readErr ? 500 : 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    const prevNotes = typeof prev.notes === 'string' ? prev.notes.trim() : '';
    const line = 'Unsubscribed via link';
    const mergedNotes = prevNotes ? `${prevNotes}\n${line}` : line;

    const { data, error } = await supabase
      .from('outreach_contacts')
      .update({
        status: 'unsubscribed',
        notes: mergedNotes,
      })
      .eq('id', c)
      .select('id')
      .maybeSingle();

    if (error) {
      return new NextResponse('Could not update', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    }
    if (!data) {
      return new NextResponse('Unknown contact', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }

    return new NextResponse(
      'You have been unsubscribed. You will not receive further onboarding messages from us.',
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  } catch {
    return new NextResponse('Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
