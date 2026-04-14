/** Bootstrap admin: must match promotion in SQL migration `20260321120000_master_admin_vendor_live_rls.sql`. */
export const MASTER_ADMIN_EMAIL = 'houseofprerolls@gmail.com';

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}
