import { NextRequest, NextResponse } from 'next/server';
import { requireMasterOutreachAuth } from '@/lib/masterOutreachRequest';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

const ALLOWED_STATUS = new Set([
  'imported',
  'queued',
  'sent',
  'replied',
  'bounced',
  'unsubscribed',
  'archived',
  'no_send',
]);

type PatchBody = {
  id?: string;
  status?: string;
  notes?: string | null;
  phone?: string | null;
  /** Claim (set to your user id) or unclaim (null). API only allows self or clear. */
  assigned_to_user_id?: string | null;
};

export async function PATCH(request: NextRequest) {
  const auth = await requireMasterOutreachAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  if (!hasServiceRoleKey()) {
    return jsonError(503, 'Service role not configured');
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return jsonError(400, 'id required');
  }

  const patch: Record<string, unknown> = {};
  if (body.status != null) {
    const s = String(body.status).trim();
    if (!ALLOWED_STATUS.has(s)) {
      return jsonError(400, `Invalid status: ${s}`);
    }
    patch.status = s;
    if (s === 'replied') {
      patch.replied_at = new Date().toISOString();
    }
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes === null ? null : String(body.notes);
  }
  if (body.phone !== undefined) {
    patch.phone = body.phone === null || body.phone === '' ? null : String(body.phone).trim();
  }
  if (body.assigned_to_user_id !== undefined) {
    if (body.assigned_to_user_id === null) {
      patch.assigned_to_user_id = null;
      patch.assigned_at = null;
    } else {
      const uid = String(body.assigned_to_user_id).trim();
      if (uid !== user.id) {
        return jsonError(400, 'You can only assign a contact to yourself');
      }
      patch.assigned_to_user_id = uid;
      patch.assigned_at = new Date().toISOString();
    }
  }

  if (Object.keys(patch).length === 0) {
    return jsonError(400, 'Nothing to update (pass status, notes, phone, and/or assigned_to_user_id)');
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from('outreach_contacts').update(patch).eq('id', id).select().maybeSingle();
    if (error) {
      return jsonError(500, error.message);
    }
    if (!data) {
      return jsonError(404, 'Contact not found');
    }
    return NextResponse.json({ contact: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Update failed';
    return jsonError(500, msg);
  }
}
