import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type UploadKind = 'feed' | 'chat';

type SignRequest = {
  kind: UploadKind;
  mime_type: string;
  bytes: number;
  duration_s?: number; // required for video
};

const BUCKET = 'community-media';
const MAX_BYTES = 25 * 1024 * 1024; // 25MB (matches bucket config)
const MAX_VIDEO_SECONDS = 15;

const allowedMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function extForMime(mime: string) {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/quicktime':
      return 'mov';
    default:
      return null;
  }
}

function isVideoMime(mime: string) {
  return mime.startsWith('video/');
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<SignRequest>;
    const kind = body.kind;
    const mimeType = String(body.mime_type || '').trim().toLowerCase();
    const bytes = Number(body.bytes);

    if (kind !== 'feed' && kind !== 'chat') {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    if (!allowedMime.has(mimeType)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    if (isVideoMime(mimeType)) {
      const dur = Number(body.duration_s);
      if (!Number.isFinite(dur) || dur <= 0) {
        return NextResponse.json({ error: 'Missing video duration' }, { status: 400 });
      }
      if (dur > MAX_VIDEO_SECONDS) {
        return NextResponse.json({ error: 'Video must be 15 seconds or less' }, { status: 400 });
      }
    }

    const ext = extForMime(mimeType);
    if (!ext) {
      return NextResponse.json({ error: 'Unsupported mime type' }, { status: 400 });
    }

    const objectPath = `${kind}/${user.id}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to sign upload' }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

    return NextResponse.json({
      bucket: BUCKET,
      object_path: objectPath,
      public_url: pub.publicUrl,
      signed_url: data.signedUrl,
      token: data.token,
    });
  } catch (error) {
    console.error('Upload sign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

