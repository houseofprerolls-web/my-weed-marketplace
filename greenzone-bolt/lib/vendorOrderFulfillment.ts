import { supabase } from '@/lib/supabase';

export function vendorFulfillmentRpc(orderId: string, newStatus: string, message: string | null = null) {
  return supabase.rpc('vendor_update_order_fulfillment', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_message: message,
  });
}

/** Jump to completed from any non-terminal status (DB: `0054_vendor_complete_order_now.sql`). */
export function vendorCompleteOrderNow(orderId: string, message: string | null = null) {
  return supabase.rpc('vendor_complete_order_now', {
    p_order_id: orderId,
    p_message: message,
  });
}
