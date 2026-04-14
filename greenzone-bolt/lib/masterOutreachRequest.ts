import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { isMasterAdminEmail } from '@/lib/admin';

export type MasterOutreachAuthOk = {
  user: User;
  accessToken: string;
};

export async function requireMasterOutreachAuth(
  request: NextRequest
): Promise<MasterOutreachAuthOk | NextResponse> {
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
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isMasterAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden — master admin only' }, { status: 403 });
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  return { user, accessToken };
}
