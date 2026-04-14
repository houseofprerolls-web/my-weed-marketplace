/** Touch phones / small tablets where “Add to Home Screen” is typical. */
export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** True when the app is already running as an installed PWA / home screen shortcut. */
export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    /* ignore */
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

const MS_PER_DAY = 86400000;

/** Profiles created within this many days may see the PWA loyalty prompt (matches server claim window). */
export const PWA_LOYALTY_SIGNUP_WINDOW_DAYS = 90;

export function isWithinPwaLoyaltySignupWindow(profileCreatedAtIso: string | null | undefined): boolean {
  if (!profileCreatedAtIso) return false;
  const t = Date.parse(profileCreatedAtIso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= PWA_LOYALTY_SIGNUP_WINDOW_DAYS * MS_PER_DAY;
}
