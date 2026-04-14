export type AdminWorkspaceRegion = 'all' | 'ca' | 'ny';

export const ADMIN_WORKSPACE_REGION_STORAGE_KEY = 'greenzone-admin-workspace-region';

export function parseAdminWorkspaceRegion(raw: string | null | undefined): AdminWorkspaceRegion {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'ca' || s === 'ny') return s;
  return 'all';
}

export const ADMIN_WORKSPACE_REGION_LABELS: Record<AdminWorkspaceRegion, string> = {
  all: 'All regions',
  ca: 'California',
  ny: 'New York',
};
