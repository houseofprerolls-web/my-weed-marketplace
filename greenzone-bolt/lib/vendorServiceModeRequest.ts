import { supabase } from '@/lib/supabase';

export type VendorServiceModeRequestRow = {
  id: string;
  vendor_id: string;
  requested_mode: 'delivery' | 'storefront';
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  created_at: string;
};

function rpcErrorMessage(error: { message?: string } | null): string {
  return error?.message?.trim() || 'Request failed';
}

export async function submitVendorServiceModeRequest(
  vendorId: string,
  requestedMode: 'delivery' | 'storefront',
  note?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('vendor_submit_service_mode_request', {
    p_vendor_id: vendorId,
    p_requested_mode: requestedMode,
    p_note: note?.trim() || null,
  });

  if (error) {
    return { ok: false, message: rpcErrorMessage(error) };
  }

  let row: { ok?: boolean; error?: string } | null = null;
  if (typeof data === 'string') {
    try {
      row = JSON.parse(data) as { ok?: boolean; error?: string };
    } catch {
      row = null;
    }
  } else if (data && typeof data === 'object') {
    row = data as { ok?: boolean; error?: string };
  }
  if (!row) {
    return { ok: true };
  }
  if (row.ok === false) {
    const code = typeof row.error === 'string' ? row.error : 'unknown';
    const human: Record<string, string> = {
      not_authenticated: 'Sign in again, then retry.',
      invalid_mode: 'Invalid request.',
      vendor_not_found: 'Shop not found.',
      forbidden: 'You can only request changes for shops linked to your account or team access.',
      already_delivery: 'Delivery is already your public service mode.',
      already_storefront: 'Storefront / pickup is already your public service mode.',
      already_both_lanes: 'Your shop is already listed for both delivery and storefront.',
      no_email: 'Your account needs an email before we can route this request.',
    };
    return { ok: false, message: human[code] || code };
  }

  return { ok: true };
}

export async function fetchPendingVendorServiceModeRequest(
  vendorId: string
): Promise<VendorServiceModeRequestRow | null> {
  const { data, error } = await supabase
    .from('vendor_service_mode_requests')
    .select('id,vendor_id,requested_mode,status,note,created_at')
    .eq('vendor_id', vendorId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as VendorServiceModeRequestRow;
}

export type AdminServiceModeRequestListRow = VendorServiceModeRequestRow & {
  email: string;
};

export async function fetchPendingServiceModeRequestsForAdmin(): Promise<
  AdminServiceModeRequestListRow[]
> {
  const { data, error } = await supabase
    .from('vendor_service_mode_requests')
    .select('id,vendor_id,requested_mode,status,note,created_at,email')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as AdminServiceModeRequestListRow[];
}
