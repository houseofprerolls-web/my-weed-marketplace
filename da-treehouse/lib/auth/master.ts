/** Single master account: full admin + bypass feature flags in the app UI. */
export const MASTER_ACCOUNT_EMAIL = "houseofprerolls@gmail.com";

export function isMasterAccountEmail(
  email: string | null | undefined
): boolean {
  return email?.trim().toLowerCase() === MASTER_ACCOUNT_EMAIL;
}
