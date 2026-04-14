import { NextRequest, NextResponse } from 'next/server';
import {
  fetchDiscoveryVendorsCore,
  type DiscoveryVendorsAudience,
} from '@/lib/publicVendors';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('audience')?.trim().toLowerCase();
    const audience: DiscoveryVendorsAudience = raw === 'directory' ? 'directory' : 'discovery';
    const db = createSupabaseDirectoryClient();
    const vendors_schema = resolveUseVendorsTableForDiscovery();
    const vendors = await fetchDiscoveryVendorsCore(vendors_schema, db, { audience });
    return NextResponse.json({ vendors_schema, vendors });
  } catch (e) {
    console.error('GET /api/discovery/vendors', e);
    const message =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Discovery vendors failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
