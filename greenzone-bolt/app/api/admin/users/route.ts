import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { isMasterAdminEmail } from '@/lib/admin';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  role: string | null;
  site_banned: boolean | null;
  site_banned_at: string | null;
  created_at: string | null;
};

type UserProfileRow = {
  id: string;
  feed_shadowbanned: boolean | null;
  username: string | null;
};

function adminJsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET — paginated auth users merged with profiles + feed shadowban flags.
 * Query: page (1-based), per_page (max 50), q (optional search on profiles email/username/full_name).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return adminJsonError(401, 'Unauthorized');
    }

    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return adminJsonError(500, 'Server missing Supabase URL or anon key');
    }

    const supabaseAuthed = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) return adminJsonError(401, 'Unauthorized');

    if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
      return adminJsonError(403, 'Forbidden');
    }

    if (!hasServiceRoleKey()) {
      return adminJsonError(
        503,
        'Server missing SUPABASE_SERVICE_ROLE_KEY — required to list auth users.'
      );
    }

    const svc = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const qRaw = (searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') || '25', 10) || 25));

    if (qRaw.length > 0) {
      const safe = qRaw.replace(/%/g, '').replace(/_/g, '').replace(/,/g, '').slice(0, 80);
      if (!safe) {
        return NextResponse.json({
          mode: 'search',
          users: [],
          page: 1,
          per_page: perPage,
          total: 0,
        });
      }
      const pattern = `%${safe}%`;
      const { data: profRows, error: profErr } = await svc
        .from('profiles')
        .select(
          'id,email,full_name,username,role,site_banned,site_banned_at,created_at'
        )
        .or(`email.ilike.${pattern},username.ilike.${pattern},full_name.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(perPage);

      if (profErr) {
        return adminJsonError(400, profErr.message);
      }

      const profList = (profRows || []) as ProfileRow[];
      const ids = profList.map((p) => p.id);
      if (ids.length === 0) {
        return NextResponse.json({
          mode: 'search',
          users: [],
          page: 1,
          per_page: perPage,
          total: 0,
        });
      }

      const { data: upRows } = await svc
        .from('user_profiles')
        .select('id,feed_shadowbanned,username')
        .in('id', ids);

      const upById = new Map<string, UserProfileRow>();
      for (const r of (upRows || []) as UserProfileRow[]) {
        upById.set(r.id, r);
      }

      const merged = await Promise.all(
        profList.map(async (p) => {
          const { data: authRes, error: authErr } = await svc.auth.admin.getUserById(p.id);
          const au = authErr ? null : authRes?.user;
          const up = upById.get(p.id);
          const auExt = au ? (au as unknown as { banned_until?: string | null }) : null;
          const bannedUntil =
            auExt && typeof auExt.banned_until === 'string' ? auExt.banned_until : null;
          return {
            id: p.id,
            email: au?.email ?? p.email ?? '',
            username: p.username ?? up?.username ?? null,
            full_name: p.full_name,
            role: p.role,
            site_banned: p.site_banned === true,
            site_banned_at: p.site_banned_at,
            feed_shadowbanned: up?.feed_shadowbanned === true,
            last_sign_in_at: au?.last_sign_in_at ?? null,
            created_at: au?.created_at ?? p.created_at,
            auth_banned_until: bannedUntil,
            is_master_admin: isMasterAdminEmail(au?.email ?? p.email),
          };
        })
      );

      return NextResponse.json({
        mode: 'search',
        users: merged,
        page: 1,
        per_page: perPage,
        total: merged.length,
      });
    }

    const { data: listData, error: listErr } = await svc.auth.admin.listUsers({
      page,
      perPage,
    });

    if (listErr || !listData?.users) {
      return adminJsonError(400, listErr?.message || 'Failed to list users');
    }

    const authUsers = listData.users;
    const ids = authUsers.map((u) => u.id);

    const { data: profRows } = await svc
      .from('profiles')
      .select('id,email,full_name,username,role,site_banned,site_banned_at,created_at')
      .in('id', ids);

    const { data: upRows } = await svc
      .from('user_profiles')
      .select('id,feed_shadowbanned,username')
      .in('id', ids);

    const profById = new Map<string, ProfileRow>();
    for (const r of (profRows || []) as ProfileRow[]) {
      profById.set(r.id, r);
    }
    const upById = new Map<string, UserProfileRow>();
    for (const r of (upRows || []) as UserProfileRow[]) {
      upById.set(r.id, r);
    }

    const merged = authUsers.map((au) => {
      const p = profById.get(au.id);
      const up = upById.get(au.id);
      const auExt = au as unknown as { banned_until?: string | null };
      const bannedUntil = typeof auExt.banned_until === 'string' ? auExt.banned_until : null;
      return {
        id: au.id,
        email: au.email ?? p?.email ?? '',
        username: p?.username ?? up?.username ?? null,
        full_name: p?.full_name ?? null,
        role: p?.role ?? null,
        site_banned: p?.site_banned === true,
        site_banned_at: p?.site_banned_at ?? null,
        feed_shadowbanned: up?.feed_shadowbanned === true,
        last_sign_in_at: au.last_sign_in_at ?? null,
        created_at: au.created_at,
        auth_banned_until: bannedUntil,
        is_master_admin: isMasterAdminEmail(au.email ?? p?.email),
      };
    });

    const total =
      typeof listData.total === 'number' && listData.total > 0
        ? listData.total
        : merged.length;

    return NextResponse.json({
      mode: 'page',
      users: merged,
      page,
      per_page: perPage,
      total,
    });
  } catch (e) {
    console.error('GET /api/admin/users', e);
    return adminJsonError(500, 'Internal server error');
  }
}
