import { supabase } from '@/lib/supabase';

/** Notifies admins (via `vendor_upgrade_requests` row) with the account email from auth. */
export async function submitVendorUpgradeRequest(context?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('vendor_request_account_upgrade', {
    p_context: context?.trim() || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: 'No response from server' };
  }
  return { ok: true };
}
