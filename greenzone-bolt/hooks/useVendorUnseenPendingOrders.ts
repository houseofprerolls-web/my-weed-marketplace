'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Pending orders for the shop that the signed-in vendor user has not opened yet
 * (no row in `vendor_order_reads`).
 */
export function useVendorUnseenPendingOrders(
  vendorId: string | null | undefined,
  userId: string | null | undefined,
  pathname: string
) {
  const [unseenIds, setUnseenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!vendorId || !userId) {
      setUnseenIds([]);
      return;
    }
    setLoading(true);
    try {
      const { data: pending, error: pErr } = await supabase
        .from('orders')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('status', 'pending');

      if (pErr || !pending?.length) {
        setUnseenIds([]);
        return;
      }

      const ids = pending.map((r) => r.id as string);
      const { data: reads, error: rErr } = await supabase
        .from('vendor_order_reads')
        .select('order_id')
        .eq('user_id', userId)
        .in('order_id', ids);

      if (rErr) {
        setUnseenIds(ids);
        return;
      }

      const readSet = new Set((reads ?? []).map((r) => r.order_id as string));
      setUnseenIds(ids.filter((id) => !readSet.has(id)));
    } finally {
      setLoading(false);
    }
  }, [vendorId, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    if (!vendorId) return;
    const t = window.setInterval(() => void refresh(), 28000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [vendorId, refresh]);

  useEffect(() => {
    if (!vendorId || !userId) return;
    const channel = supabase
      .channel(`vendor-orders-${vendorId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendorId}` },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [vendorId, userId, refresh]);

  return {
    unseenIds,
    unseenCount: unseenIds.length,
    refresh,
    loading,
  };
}
