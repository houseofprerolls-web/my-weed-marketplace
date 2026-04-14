import { supabase } from '@/lib/supabase';
import { loadVendorMapAreaGate, type VendorMapAreaGate } from '@/lib/vendorMapAreaGate';

export type EnableFromPinRpcResult = {
  ok: boolean;
  market_id?: string;
  reason?: string;
};

/** Normalize to 5-digit US ZIP when possible; returns null if not enough digits. */
export function normalizeUsPostcodeDigits(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length < 5) return null;
  return d.slice(0, 5);
}

/**
 * Turn on the listing_market for this vendor that matches the given ZIP (via market_zip_prefixes).
 * No-op when ZIP is invalid; RPC returns ok:false without raising.
 */
export async function enableVendorMarketFromPostcode(
  vendorId: string,
  postcode: string | null | undefined
): Promise<EnableFromPinRpcResult> {
  const z = normalizeUsPostcodeDigits(postcode);
  if (!z) return { ok: false, reason: 'invalid_zip' };

  const { data, error } = await supabase.rpc('vendor_enable_market_from_pin', {
    p_vendor_id: vendorId,
    p_postcode: z,
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  const row = data as { ok?: boolean; market_id?: string; reason?: string } | null;
  if (!row?.ok) {
    return { ok: false, reason: row?.reason ?? 'rpc' };
  }
  return { ok: true, market_id: row.market_id };
}

export async function reloadVendorMapGate(vendorId: string): Promise<VendorMapAreaGate | null> {
  const res = await loadVendorMapAreaGate(vendorId);
  if (!res.ok) return null;
  return res.gate;
}
