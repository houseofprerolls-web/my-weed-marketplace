import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** @deprecated Use `/api/public/marketing-banners` — kept for old clients. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.toString();
  const path = '/api/public/marketing-banners' + (q ? `?${q}` : '');
  return NextResponse.redirect(new URL(path, req.url), 307);
}
