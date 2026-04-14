/** Bootstrap admins: must match `sync_profile_role_from_auth_email` in Supabase migrations. */
const BOOTSTRAP_ADMIN_EMAILS = [
  'houseofprerolls@gmail.com',
  'bballer2k74@gmail.com',
] as const;

/** Primary master admin (legacy export). */
export const MASTER_ADMIN_EMAIL = BOOTSTRAP_ADMIN_EMAILS[0];

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const n = email.trim().toLowerCase();
  return BOOTSTRAP_ADMIN_EMAILS.some((e) => e.toLowerCase() === n);
}
