import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/embed/menu/:path*'],
};

/**
 * CSP frame-ancestors from DB (vendor_menu_embed_origins + RPC).
 * Empty allowlist → no embedding (frame-ancestors 'none').
 */
export async function middleware(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!baseUrl || !anon) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  const prefix = '/embed/menu/';
  if (!path.startsWith(prefix)) return NextResponse.next();

  const slug = decodeURIComponent(path.slice(prefix.length).split('/')[0] || '').trim();
  if (!slug) {
    const res = NextResponse.next();
    res.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    return res;
  }

  try {
    const rpcUrl = `${baseUrl.replace(/\/$/, '')}/rest/v1/rpc/vendor_embed_frame_ancestors_for_slug`;
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({ p_slug: slug }),
    });

    const data = (await res.json()) as unknown;
    const list = Array.isArray(data)
      ? data.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
      : [];

    const csp =
      list.length > 0
        ? `frame-ancestors ${list.join(' ')} 'self'`
        : "frame-ancestors 'none'";

    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', csp);
    return response;
  } catch {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    return response;
  }
}
