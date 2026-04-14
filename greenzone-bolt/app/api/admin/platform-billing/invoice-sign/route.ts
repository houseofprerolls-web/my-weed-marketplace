import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

const BUCKET = 'platform-billing-invoices';
const MAX_BYTES = 10 * 1024 * 1024;

const allowedMime = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function extForMime(mime: string) {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server missing Supabase env' }, { status: 500 });
    }
    const supabaseAuthed = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!hasServiceRoleKey()) {
      return NextResponse.json({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as {
      account_id?: string;
      mime_type?: string;
      bytes?: number;
    } | null;

    const account_id = String(body?.account_id || '').trim();
    const mimeType = String(body?.mime_type || '').trim().toLowerCase();
    const bytes = Number(body?.bytes);

    if (!account_id) {
      return NextResponse.json({ error: 'account_id required' }, { status: 400 });
    }
    if (!allowedMime.has(mimeType)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    const ext = extForMime(mimeType);
    if (!ext) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const db = createServiceRoleClient();
    const { data: acc, error: accErr } = await db
      .from('platform_billing_accounts')
      .select('id')
      .eq('id', account_id)
      .maybeSingle();
    if (accErr || !acc) {
      return NextResponse.json({ error: 'Billing account not found' }, { status: 404 });
    }

    const objectPath = `${account_id}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabaseAuthed.storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to sign upload' }, { status: 500 });
    }

    return NextResponse.json({
      bucket: BUCKET,
      object_path: objectPath,
      signed_url: data.signedUrl,
      token: data.token,
    });
  } catch (e) {
    console.error('POST /api/admin/platform-billing/invoice-sign', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
