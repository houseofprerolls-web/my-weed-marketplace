import { NextResponse } from 'next/server';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { isPublicLaunchVendorAllowlistActive, parseLaunchVendorAllowlist } from '@/lib/launchPublicSurface';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';

export const dynamic = 'force-dynamic';

type RpcRow = { vendor_id: string; sku_count: number | string | null };

export async function GET() {
  const vendors_schema = resolveUseVendorsTableForDiscovery();
  if (!vendors_schema) {
    return NextResponse.json({ counts: {} as Record<string, number> });
  }

  try {
    const db = createSupabaseDirectoryClient();
    const { data, error } = await db.rpc('discovery_live_menu_sku_counts');
    if (error) {
      console.warn('GET /api/discovery/live-menu-vendors rpc:', error.message);
      return NextResponse.json({ counts: {} as Record<string, number> });
    }
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as RpcRow[]) {
      const id = row?.vendor_id;
      if (!id) continue;
      const n = Number(row.sku_count);
      if (Number.isFinite(n) && n > 0) counts[id] = n;
    }

    if (isPublicLaunchVendorAllowlistActive()) {
      const allow = parseLaunchVendorAllowlist() ?? [];
      const { data: idRows, error: idErr } = await db.from('vendors').select('id').in('slug', allow);
      if (!idErr && idRows?.length) {
        const allowed = new Set(idRows.map((r: { id: string }) => r.id));
        const next: Record<string, number> = {};
        for (const [vid, n] of Object.entries(counts)) {
          if (allowed.has(vid)) next[vid] = n;
        }
        return NextResponse.json({ counts: next });
      }
      return NextResponse.json({ counts: {} });
    }

    return NextResponse.json({ counts });
  } catch (e) {
    console.error('GET /api/discovery/live-menu-vendors', e);
    return NextResponse.json({ counts: {} as Record<string, number> });
  }
}
