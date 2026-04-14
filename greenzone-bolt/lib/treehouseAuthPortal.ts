/**
 * Shared Treehouse / DaTreehouse visuals for login, sign-up modal, and auth routes
 * (brand red + lime ring, dark zinc shell — matches age gate / site accents).
 */

export const treehouseAuthPageShell =
  'min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white antialiased';

/** Card panel used on /auth/* pages and inside dialogs. */
export const treehouseAuthPanelClass =
  'border-2 border-brand-red/40 bg-zinc-950/95 shadow-2xl ring-1 ring-brand-lime/30 backdrop-blur-sm';

/** Logo strip (optional wrapper around BrandLogo). */
export const treehouseAuthLogoFrameClass =
  'rounded-xl border border-brand-lime/30 bg-black/40 px-5 py-3 ring-2 ring-brand-red/20';

export const treehouseAuthInputClass =
  'border-brand-lime/25 bg-black/50 text-white placeholder:text-zinc-500 focus-visible:border-brand-lime/55 focus-visible:ring-brand-lime/25';

export const treehouseAuthPrimaryButtonClass =
  'w-full bg-brand-red font-semibold text-white shadow-md shadow-brand-red/25 hover:bg-brand-red-deep';

export const treehouseAuthGhostLinkClass =
  'text-sm font-medium text-brand-lime/90 underline-offset-2 hover:text-brand-lime hover:underline disabled:opacity-50';
