import { NextRequest, NextResponse } from 'next/server';
import { requireMasterOutreachAuth } from '@/lib/masterOutreachRequest';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ContactRow = Record<string, unknown> & { id: string };

function profileLabel(map: Map<string, string>, userId: string | null | undefined): string | null {
  if (!userId) return null;
  return map.get(userId) ?? `User ${userId.slice(0, 8)}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireMasterOutreachAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasServiceRoleKey()) {
    return jsonError(503, 'Service role not configured');
  }
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '50', 10) || 50));
  const status = searchParams.get('status')?.trim() || '';
  const premiseKind = searchParams.get('premise_kind')?.trim() || '';
  const q = searchParams.get('q')?.trim() || '';
  const boardScope = searchParams.get('board_scope')?.trim().toLowerCase() || 'team';
  const assignedTo = searchParams.get('assigned_to')?.trim() || '';

  try {
    const supabase = createServiceRoleClient();

    let touchedIds: string[] = [];
    if (boardScope === 'my') {
      const { data: sendRows, error: sendErr } = await supabase
        .from('outreach_sends')
        .select('contact_id')
        .eq('sent_by_user_id', user.id)
        .is('error', null);
      if (sendErr) {
        console.error(sendErr);
        return jsonError(500, sendErr.message);
      }
      touchedIds = Array.from(new Set((sendRows ?? []).map((r) => r.contact_id as string)));
    }

    let query = supabase.from('outreach_contacts').select('*', { count: 'exact' });
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (premiseKind && ['storefront', 'delivery', 'unknown'].includes(premiseKind)) {
      query = query.eq('uls_premise_kind', premiseKind);
    }
    if (q) {
      const safe = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(
        `email.ilike.%${safe}%,company_name.ilike.%${safe}%,person_name.ilike.%${safe}%,phone.ilike.%${safe}%,notes.ilike.%${safe}%`
      );
    }

    if (boardScope === 'my') {
      if (touchedIds.length === 0) {
        query = query.eq('assigned_to_user_id', user.id);
      } else {
        query = query.or(`assigned_to_user_id.eq.${user.id},id.in.(${touchedIds.join(',')})`);
      }
    }

    if (assignedTo === 'me') {
      query = query.eq('assigned_to_user_id', user.id);
    } else if (assignedTo === 'unassigned') {
      query = query.is('assigned_to_user_id', null);
    } else if (assignedTo && UUID_RE.test(assignedTo)) {
      query = query.eq('assigned_to_user_id', assignedTo);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) {
      console.error(error);
      return jsonError(500, error.message);
    }

    const contacts = (data ?? []) as ContactRow[];
    const ids = contacts.map((c) => c.id);

    const lastSentBy = new Map<string, string>();
    if (ids.length > 0) {
      const { data: sends, error: sendsErr } = await supabase
        .from('outreach_sends')
        .select('contact_id, sent_by_user_id, sent_at')
        .in('contact_id', ids)
        .is('error', null)
        .order('sent_at', { ascending: false });
      if (sendsErr) {
        console.error(sendsErr);
        return jsonError(500, sendsErr.message);
      }
      for (const s of sends ?? []) {
        const cid = s.contact_id as string;
        const sid = s.sent_by_user_id as string | null;
        if (!lastSentBy.has(cid) && sid) {
          lastSentBy.set(cid, sid);
        }
      }
    }

    const profileIds = new Set<string>();
    for (const c of contacts) {
      const a = c.assigned_to_user_id as string | null | undefined;
      if (a) profileIds.add(a);
    }
    for (const uid of Array.from(lastSentBy.values())) {
      profileIds.add(uid);
    }

    const labelById = new Map<string, string>();
    if (profileIds.size > 0) {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(profileIds));
      if (profErr) {
        console.error(profErr);
        return jsonError(500, profErr.message);
      }
      for (const p of profiles ?? []) {
        const id = p.id as string;
        const name = ((p.full_name as string) || '').trim();
        labelById.set(id, name || `User ${id.slice(0, 8)}`);
      }
    }

    const enriched = contacts.map((c) => {
      const assigneeId = (c.assigned_to_user_id as string | null | undefined) ?? null;
      const lastUid = lastSentBy.get(c.id) ?? null;
      return {
        ...c,
        last_sent_by_user_id: lastUid,
        last_sent_by_label: profileLabel(labelById, lastUid),
        assigned_to_label: profileLabel(labelById, assigneeId),
      };
    });

    return NextResponse.json({
      contacts: enriched,
      total: count ?? 0,
      page,
      per_page: perPage,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Query failed';
    return jsonError(500, msg);
  }
}
