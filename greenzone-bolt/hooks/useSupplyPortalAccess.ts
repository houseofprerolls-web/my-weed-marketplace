'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SupplyPortalAssignment = {
  id: string;
  supply_account_id: string;
  role: string;
  account_name: string;
  account_slug: string;
};

export type UseSupplyPortalAccessOptions = {
  treatAsAdmin?: boolean;
};

export function useSupplyPortalAccess(
  userId: string | null | undefined,
  options?: UseSupplyPortalAccessOptions
) {
  const treatAsAdmin = options?.treatAsAdmin === true;
  const [assignments, setAssignments] = useState<SupplyPortalAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    if (treatAsAdmin) {
      const { data: accounts, error } = await supabase
        .from('supply_accounts')
        .select('id,name,slug')
        .order('name');
      if (error) {
        setAssignments([]);
        setLoading(false);
        return;
      }
      setAssignments(
        (accounts || []).map((a) => ({
          id: `admin:${a.id}`,
          supply_account_id: a.id,
          role: 'owner',
          account_name: a.name ?? 'Supply',
          account_slug: a.slug ?? '',
        }))
      );
      setLoading(false);
      return;
    }

    const { data: rows, error } = await supabase
      .from('supply_account_members')
      .select('id,supply_account_id,role')
      .eq('user_id', userId);
    if (error) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    if (!rows?.length) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    const ids = rows.map((r) => r.supply_account_id);
    const { data: accs } = await supabase.from('supply_accounts').select('id,name,slug').in('id', ids);
    const meta = new Map((accs || []).map((a) => [a.id, { name: a.name, slug: a.slug }]));
    setAssignments(
      rows.map((r) => {
        const m = meta.get(r.supply_account_id);
        return {
          id: r.id,
          supply_account_id: r.supply_account_id,
          role: r.role ?? 'editor',
          account_name: m?.name ?? 'Supply account',
          account_slug: m?.slug ?? '',
        };
      })
    );
    setLoading(false);
  }, [userId, treatAsAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mayAccess = treatAsAdmin || assignments.length > 0;

  return { assignments, loading, refresh, mayAccess };
}
