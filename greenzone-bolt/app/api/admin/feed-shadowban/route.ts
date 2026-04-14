import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';

type Body = {
  user_id?: string;
  shadowbanned?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAuthed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = await requestUserIsAdmin(supabaseAuthed, user);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await request.json()) as Body;
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    const shadowbanned = body.shadowbanned === true;
    if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({ id: userId, feed_shadowbanned: shadowbanned }, { onConflict: 'id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logAdminAuditEvent(supabaseAuthed, {
      actionKey: 'user.feed_shadowban',
      summary: shadowbanned ? `Feed shadowban enabled for user ${userId}` : `Feed shadowban cleared for user ${userId}`,
      resourceType: 'user_profiles',
      resourceId: userId,
      metadata: { shadowbanned },
    });

    return NextResponse.json({ ok: true, user_id: userId, shadowbanned });
  } catch (error) {
    console.error('POST /api/admin/feed-shadowban', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

