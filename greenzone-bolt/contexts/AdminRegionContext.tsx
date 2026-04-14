'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  ADMIN_WORKSPACE_REGION_STORAGE_KEY,
  type AdminWorkspaceRegion,
  parseAdminWorkspaceRegion,
} from '@/lib/adminRegionWorkspace';

type Ctx = {
  region: AdminWorkspaceRegion;
  setRegion: (r: AdminWorkspaceRegion) => void;
};

const AdminRegionContext = createContext<Ctx | null>(null);

function readStoredRegion(): AdminWorkspaceRegion {
  if (typeof window === 'undefined') return 'all';
  try {
    return parseAdminWorkspaceRegion(localStorage.getItem(ADMIN_WORKSPACE_REGION_STORAGE_KEY));
  } catch {
    return 'all';
  }
}

export function AdminRegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<AdminWorkspaceRegion>(() => readStoredRegion());

  const setRegion = useCallback((r: AdminWorkspaceRegion) => {
    setRegionState(r);
    try {
      localStorage.setItem(ADMIN_WORKSPACE_REGION_STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ region, setRegion }), [region, setRegion]);

  return <AdminRegionContext.Provider value={value}>{children}</AdminRegionContext.Provider>;
}

export function useAdminWorkspaceRegion(): Ctx {
  const ctx = useContext(AdminRegionContext);
  if (!ctx) {
    throw new Error('useAdminWorkspaceRegion must be used within AdminRegionProvider');
  }
  return ctx;
}
