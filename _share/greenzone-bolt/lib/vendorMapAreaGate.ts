/**
 * Map pin placement vs admin-enabled operating areas (vendor_market_operations + market_zip_prefixes).
 * Mirrors Admin → Vendors → per-vendor market toggles (0026_vendor_market_operations.sql).
 */

import { supabase } from '@/lib/supabase';

export type VendorMapAreaGate = {
  approvedMarketIds: Set<string>;
  prefixToMarketId: Map<string, string>;
  californiaOtherId: string | null;
  enabledMarketNames: string[];
};

export const MAP_PIN_AREA_NOT_ENABLED =
  'Area not enabled for your store. Ask an administrator to turn on this region in Admin → Vendors → your store → operating areas.';

export function zipPrefixFromUsPostcode(postcode: string): string | null {
  const d = postcode.replace(/\D/g, '');
  if (d.length < 5) return null;
  return d.slice(0, 3);
}

/** ZIP at this point must map to a listing_market the admin has approved for this vendor. */
export function postcodeAllowedForVendorMarkets(postcode: string, gate: VendorMapAreaGate): boolean {
  if (gate.approvedMarketIds.size === 0) return false;
  const pref = zipPrefixFromUsPostcode(postcode);
  if (!pref) return false;
  const marketForPrefix = gate.prefixToMarketId.get(pref);
  if (marketForPrefix) {
    return gate.approvedMarketIds.has(marketForPrefix);
  }
  if (gate.californiaOtherId && gate.approvedMarketIds.has(gate.californiaOtherId)) {
    return true;
  }
  return false;
}

export type LoadVendorMapAreaGateResult =
  | { ok: true; gate: VendorMapAreaGate }
  | { ok: false; error: string };

export async function loadVendorMapAreaGate(vendorId: string): Promise<LoadVendorMapAreaGateResult> {
  try {
    const [{ data: ops, error: opsErr }, { data: prefixes, error: prefErr }, { data: cali, error: caliErr }] =
      await Promise.all([
        supabase.from('vendor_market_operations').select('market_id').eq('vendor_id', vendorId).eq('approved', true),
        supabase.from('market_zip_prefixes').select('prefix, market_id'),
        supabase.from('listing_markets').select('id').eq('slug', 'california-other').maybeSingle(),
      ]);

    if (opsErr) return { ok: false, error: opsErr.message };
    if (prefErr) return { ok: false, error: prefErr.message };
    if (caliErr) return { ok: false, error: caliErr.message };

    const approvedMarketIds = new Set((ops || []).map((o: { market_id: string }) => o.market_id));
    const prefixToMarketId = new Map<string, string>();
    for (const row of prefixes || []) {
      const r = row as { prefix: string; market_id: string };
      prefixToMarketId.set(r.prefix, r.market_id);
    }
    const californiaOtherId = cali?.id ?? null;

    let enabledMarketNames: string[] = [];
    if (approvedMarketIds.size > 0) {
      const ids = Array.from(approvedMarketIds);
      const { data: names, error: namesErr } = await supabase
        .from('listing_markets')
        .select('id,name')
        .in('id', ids);
      if (namesErr) return { ok: false, error: namesErr.message };
      const byId = new Map((names || []).map((n: { id: string; name: string }) => [n.id, n.name]));
      enabledMarketNames = ids.map((id) => byId.get(id) || id).filter(Boolean);
    }

    return {
      ok: true,
      gate: {
        approvedMarketIds,
        prefixToMarketId,
        californiaOtherId,
        enabledMarketNames,
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load operating areas';
    return { ok: false, error: msg };
  }
}
