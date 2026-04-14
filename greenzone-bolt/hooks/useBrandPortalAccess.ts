'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type BrandPortalAssignment = {
  id: string;
  brand_id: string;
  brand_name: string;
  brand_slug: string;
};

export type UseBrandPortalAccessOptions = {
  /** When true, load every brand for the directory editor (same RPC rights as managers). */
  treatAsAdmin?: boolean;
};

/**
 * Brands the signed-in user may edit via `brand_manager_update_showcase`:
 * rows in `brand_page_managers`, or all brands when `treatAsAdmin` (admin / junior admin).
 */
export function useBrandPortalAccess(
  userId: string | null | undefined,
  options?: UseBrandPortalAccessOptions
) {
  const treatAsAdmin = options?.treatAsAdmin === true;
  const [assignments, setAssignments] = useState<BrandPortalAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    if (treatAsAdmin) {
      const { data: brands, error } = await supabase
        .from('brands')
        .select('id,name,slug')
        .order('name');
      if (error) {
        setAssignments([]);
        setLoading(false);
        return;
      }
      setAssignments(
        (brands || []).map((b) => ({
          id: `admin:${b.id}`,
          brand_id: b.id,
          brand_name: b.name ?? 'Brand',
          brand_slug: b.slug ?? '',
        }))
      );
      setLoading(false);
      return;
    }

    const { data: rows, error } = await supabase
      .from('brand_page_managers')
      .select('id,brand_id')
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
    const brandIds = rows.map((r) => r.brand_id);
    const { data: brands } = await supabase.from('brands').select('id,name,slug').in('id', brandIds);
    const nameById = new Map((brands || []).map((b) => [b.id, { name: b.name, slug: b.slug }]));
    setAssignments(
      rows.map((r) => {
        const meta = nameById.get(r.brand_id);
        return {
          id: r.id,
          brand_id: r.brand_id,
          brand_name: meta?.name ?? 'Brand',
          brand_slug: meta?.slug ?? '',
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
