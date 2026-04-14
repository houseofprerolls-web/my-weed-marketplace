/** Prefer `online_menu_enabled`; fall back to legacy `discover_menu_visible` before migration 0066. */
export function vendorRowPublicMenuEnabled(v: Record<string, unknown>): boolean {
  if (typeof v.online_menu_enabled === 'boolean') return v.online_menu_enabled;
  if (typeof v.discover_menu_visible === 'boolean') return v.discover_menu_visible;
  return true;
}
