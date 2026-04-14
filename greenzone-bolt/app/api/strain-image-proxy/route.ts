import { NextRequest, NextResponse } from 'next/server';
import { isAllowedStrainImageHost } from '@/lib/strainImageProxyAllowlist';

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw || raw.length > 8_000) {
    return NextResponse.json({ error: 'Invalid or missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
  }
  if (process.env.NODE_ENV === 'production' && target.protocol !== 'https:') {
    return NextResponse.json({ error: 'HTTPS required' }, { status: 400 });
  }

  if (target.username || target.password) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!isAllowedStrainImageHost(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      signal: ctrl.signal,
      headers: { Accept: 'image/*,*/*;q=0.8' },
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
    }

    const ct = upstream.headers.get('content-type') || '';
    if (!ct.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': ct.split(';')[0].trim(),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return NextResponse.json(
      { error: aborted ? 'Fetch timeout' : 'Fetch failed' },
      { status: 504 }
    );
  } finally {
    clearTimeout(timer);
  }
}
