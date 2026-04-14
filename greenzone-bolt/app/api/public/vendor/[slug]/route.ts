import { NextResponse } from 'next/server';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { isVendorListingUuid } from '@/lib/listingPath';

export const dynamic = 'force-dynamic';

/**
 * Public vendor row for `/listing/[slug]` — `slug` may be vendors.slug or a legacy UUID (vendors.id / vendor_profiles.id).
 */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const raw = (params.slug ?? '').trim();
  if (!raw) {
    return NextResponse.json({ error: 'Missing vendor slug or id' }, { status: 400 });
  }

  try {
    const db = createSupabaseDirectoryClient();
    const vendorsMode = resolveUseVendorsTableForDiscovery();
    const byUuid = isVendorListingUuid(raw);

    if (vendorsMode) {
      if (byUuid) {
        const { data: v, error: vErr } = await db
          .from('vendors')
          .select('*')
          .eq('id', raw)
          .eq('license_status', 'approved')
          .eq('billing_delinquent', false)
          .or('is_live.eq.true,user_id.not.is.null')
          .maybeSingle();

        if (vErr) {
          console.error('GET /api/public/vendor/[slug] vendors by id', vErr);
          return NextResponse.json({ error: vErr.message }, { status: 500 });
        }
        if (v) {
          return NextResponse.json({ source: 'vendors' as const, row: v });
        }

        const { data: p, error: pErr } = await db
          .from('vendor_profiles')
          .select('*')
          .eq('id', raw)
          .eq('is_approved', true)
          .eq('is_live', true)
          .eq('approval_status', 'approved')
          .maybeSingle();

        if (pErr) {
          console.error('GET /api/public/vendor/[slug] vendor_profiles by id', pErr);
          return NextResponse.json({ error: pErr.message }, { status: 500 });
        }
        if (p) {
          return NextResponse.json({ source: 'vendor_profiles' as const, row: p });
        }
      } else {
        const { data: v, error: vErr } = await db
          .from('vendors')
          .select('*')
          .eq('slug', raw)
          .eq('license_status', 'approved')
          .eq('billing_delinquent', false)
          .or('is_live.eq.true,user_id.not.is.null')
          .maybeSingle();

        if (vErr) {
          console.error('GET /api/public/vendor/[slug] vendors by slug', vErr);
          return NextResponse.json({ error: vErr.message }, { status: 500 });
        }
        if (v) {
          return NextResponse.json({ source: 'vendors' as const, row: v });
        }
      }
    } else {
      if (byUuid) {
        const { data: p, error: pErr } = await db
          .from('vendor_profiles')
          .select('*')
          .eq('id', raw)
          .eq('is_approved', true)
          .eq('is_live', true)
          .eq('approval_status', 'approved')
          .maybeSingle();

        if (pErr) {
          console.error('GET /api/public/vendor/[slug] vendor_profiles by id', pErr);
          return NextResponse.json({ error: pErr.message }, { status: 500 });
        }
        if (p) {
          return NextResponse.json({ source: 'vendor_profiles' as const, row: p });
        }

        const { data: v, error: vErr } = await db
          .from('vendors')
          .select('*')
          .eq('id', raw)
          .eq('license_status', 'approved')
          .eq('billing_delinquent', false)
          .or('is_live.eq.true,user_id.not.is.null')
          .maybeSingle();

        if (vErr) {
          console.error('GET /api/public/vendor/[slug] vendors by id', vErr);
          return NextResponse.json({ error: vErr.message }, { status: 500 });
        }
        if (v) {
          return NextResponse.json({ source: 'vendors' as const, row: v });
        }
      } else {
        const { data: v, error: vErr } = await db
          .from('vendors')
          .select('*')
          .eq('slug', raw)
          .eq('license_status', 'approved')
          .eq('billing_delinquent', false)
          .or('is_live.eq.true,user_id.not.is.null')
          .maybeSingle();

        if (vErr) {
          console.error('GET /api/public/vendor/[slug] vendors by slug', vErr);
          return NextResponse.json({ error: vErr.message }, { status: 500 });
        }
        if (v) {
          return NextResponse.json({ source: 'vendors' as const, row: v });
        }
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load vendor';
    console.error('GET /api/public/vendor/[slug]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
