/** Allowed `brands.page_theme` values (DB check + showcase RPC). */
export const BRAND_PAGE_THEME_IDS = ['emerald', 'violet', 'sunset', 'ocean', 'mono'] as const;
export type BrandPageThemeId = (typeof BRAND_PAGE_THEME_IDS)[number];

export function isBrandPageThemeId(v: string): v is BrandPageThemeId {
  return (BRAND_PAGE_THEME_IDS as readonly string[]).includes(v);
}

/** Visual preset for `/brands` directory cards (background + hero tint). */
export const BRAND_INDEX_CARD_THEME: Record<
  BrandPageThemeId,
  { mesh: string; heroTint: string; accent: string; glow: string }
> = {
  emerald: {
    mesh: 'from-emerald-900/80 via-zinc-950 to-black',
    heroTint: 'from-zinc-950 via-zinc-950/55 to-emerald-900/25',
    accent: 'text-emerald-300',
    glow: 'shadow-emerald-500/15',
  },
  violet: {
    mesh: 'from-violet-900/80 via-zinc-950 to-black',
    heroTint: 'from-zinc-950 via-zinc-950/55 to-violet-900/30',
    accent: 'text-violet-300',
    glow: 'shadow-violet-500/15',
  },
  sunset: {
    mesh: 'from-orange-950/90 via-rose-950/70 to-black',
    heroTint: 'from-zinc-950 via-zinc-950/50 to-orange-900/35',
    accent: 'text-orange-300',
    glow: 'shadow-orange-500/15',
  },
  ocean: {
    mesh: 'from-cyan-950/85 via-sky-950/50 to-black',
    heroTint: 'from-zinc-950 via-zinc-950/55 to-cyan-900/30',
    accent: 'text-cyan-300',
    glow: 'shadow-cyan-500/15',
  },
  mono: {
    mesh: 'from-zinc-800 via-zinc-950 to-black',
    heroTint: 'from-zinc-950 via-zinc-950/60 to-zinc-800/40',
    accent: 'text-zinc-300',
    glow: 'shadow-zinc-500/10',
  },
};

export function resolveBrandPageThemeId(raw: string | null | undefined): BrandPageThemeId {
  const t = String(raw || '').trim().toLowerCase();
  return isBrandPageThemeId(t) ? t : 'emerald';
}
