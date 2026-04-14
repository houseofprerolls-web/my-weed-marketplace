import type { CSSProperties } from 'react';

/** Safe subset for inline `style={{ color }}` — hex only, no `url()` / `;` injection. */
const MENU_TEXT_COLOR_HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function sanitizeMenuTextColor(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  if (MENU_TEXT_COLOR_HEX.test(s)) return s;
  return null;
}

export function menuSkuTitleStyle(color: string | null | undefined): CSSProperties | undefined {
  const c = sanitizeMenuTextColor(color);
  return c ? { color: c } : undefined;
}
