import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { isMasterAdminEmail } from '@/lib/admin';

/** ~100 years — Supabase Auth ban until lifted explicitly. */
const LONG_BAN_DURATION = '876000h';

type Body = {
  user_id?: string;
  banned?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const supabaseAuthed = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Body;
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    const banned = body.banned === true;
    if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot change your own ban status' }, { status: 400 });
    }

    const svc = createServiceRoleClient();
    const { data: targetAuth, error: getErr } = await svc.auth.admin.getUserById(userId);
    if (getErr || !targetAuth?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetEmail = targetAuth.user.email ?? '';
    if (banned && isMasterAdminEmail(targetEmail)) {
      return NextResponse.json({ error: 'Cannot ban a master admin account' }, { status: 403 });
    }

    const { error: authBanErr } = await svc.auth.admin.updateUserById(userId, {
      ban_duration: banned ? LONG_BAN_DURATION : 'none',
    });
    if (authBanErr) {
      return NextResponse.json({ error: authBanErr.message }, { status: 400 });
    }

    const { error: profErr } = await svc
      .from('profiles')
      .update({
        site_banned: banned,
        site_banned_at: banned ? new Date().toISOString() : null,
      })
      .eq('id', userId);

    if (profErr) {
      await svc.auth.admin.updateUserById(userId, { ban_duration: 'none' }).catch(() => {});
      return NextResponse.json({ error: profErr.message }, { status: 400 });
    }

    await logAdminAuditEvent(supabaseAuthed, {
      actionKey: 'user.site_ban',
      summary: banned ? `Site ban enabled for user ${userId}` : `Site ban cleared for user ${userId}`,
      resourceType: 'profiles',
      resourceId: userId,
      metadata: { banned },
    });

    return NextResponse.json({ ok: true, user_id: userId, banned });
  } catch (error) {
    console.error('POST /api/admin/site-ban', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
