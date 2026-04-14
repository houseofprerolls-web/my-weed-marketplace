import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';

const BUCKET = 'brand-showcase-images';
const MAX_BYTES = 8 * 1024 * 1024;

const allowedMime = new Set(['image/png', 'image/jpeg', 'image/webp']);

function extForMime(mime: string): string | null {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function userMayManageBrandShowcaseImages(
  supabaseAuthed: SupabaseClient,
  user: User,
  brandId: string
): Promise<boolean> {
  if (await requestUserIsAdmin(supabaseAuthed, user)) return true;

  const { data: profAdm, error: paErr } = await supabaseAuthed.rpc('auth_is_profile_admin');
  if (!paErr && profAdm === true) return true;

  const { data: mgr } = await supabaseAuthed
    .from('brand_page_managers')
    .select('id')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (mgr) return true;

  const { data: members, error: memErr } = await supabaseAuthed
    .from('supply_account_members')
    .select('supply_account_id')
    .eq('user_id', user.id);
  if (memErr || !members?.length) return false;
  const accountIds = Array.from(new Set(members.map((m) => m.supply_account_id as string)));
  const { data: linked } = await supabaseAuthed
    .from('supply_accounts')
    .select('id')
    .in('id', accountIds)
    .eq('brand_id', brandId)
    .limit(1);
  return (linked?.length ?? 0) > 0;
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

    const body = (await request.json().catch(() => null)) as {
      brand_id?: string;
      kind?: string;
      mime_type?: string;
      bytes?: number;
    } | null;

    const brand_id = String(body?.brand_id || '').trim();
    const kind = String(body?.kind || '').trim().toLowerCase();
    const mimeType = String(body?.mime_type || '').trim().toLowerCase();
    const bytes = Number(body?.bytes);

    if (!UUID_RE.test(brand_id)) {
      return NextResponse.json({ error: 'Invalid brand_id' }, { status: 400 });
    }
    if (kind !== 'logo' && kind !== 'hero') {
      return NextResponse.json({ error: 'kind must be logo or hero' }, { status: 400 });
    }
    if (!allowedMime.has(mimeType)) {
      return NextResponse.json({ error: 'Only PNG, JPEG, or WebP images are allowed' }, { status: 400 });
    }
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
      return NextResponse.json({ error: 'Invalid file size (max 8MB)' }, { status: 400 });
    }

    const ext = extForMime(mimeType);
    if (!ext) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    if (!(await userMayManageBrandShowcaseImages(supabaseAuthed, user, brand_id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const objectPath = `${brand_id}/${kind}.${ext}`;

    const { data, error } = await supabaseAuthed.storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to sign upload' }, { status: 500 });
    }

    const { data: pub } = supabaseAuthed.storage.from(BUCKET).getPublicUrl(objectPath);

    return NextResponse.json({
      bucket: BUCKET,
      object_path: objectPath,
      signed_url: data.signedUrl,
      token: data.token,
      public_url: pub.publicUrl,
    });
  } catch (e) {
    console.error('POST /api/brand-showcase/image-upload-sign', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
