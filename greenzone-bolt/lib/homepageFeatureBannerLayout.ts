/**
 * Short “cover” strips (~5:1–6:1 at common widths) — similar to Twitter/X or Leafly header bars.
 * Easier for creatives than a tall cinematic frame. object-cover fills; logo fallbacks use object-contain.
 */

/**
 * Fixed-height viewport for absolutely positioned slides.
 * Use `block` (not `flex`) so height does not collapse when all children are `position:absolute`.
 */
/** In-page strips — extra-compact header bar */
export const FEATURE_BANNER_VIEWPORT_CLASSNAME =
  'relative mx-auto block min-h-[min(12vw,44px)] h-[min(12vw,44px)] max-h-[min(12vw,44px)] w-full min-w-0 sm:min-h-[52px] sm:h-[52px] sm:max-h-[52px] lg:min-h-[56px] lg:h-[56px] lg:max-h-[56px]';

export const FEATURE_BANNER_LOADING_SKELETON_CLASSNAME =
  'h-[min(12vw,44px)] w-full sm:h-[52px] lg:h-[56px]';

/** Homepage hero — slightly taller than strips */
export const FEATURE_BANNER_HERO_VIEWPORT_CLASSNAME =
  'relative mx-auto block min-h-[min(13vw,50px)] h-[min(13vw,50px)] max-h-[min(13vw,50px)] w-full min-w-0 sm:min-h-[60px] sm:h-[60px] sm:max-h-[60px] lg:min-h-[64px] lg:h-[64px] lg:max-h-[64px]';

export const FEATURE_BANNER_HERO_LOADING_SKELETON_CLASSNAME =
  'h-[min(13vw,50px)] w-full sm:h-[60px] lg:h-[64px]';

/**
 * Narrower rail so strips don’t feel stretched across the whole content column.
 * Smokers Club uses constrainStripWidth={false} for full card width.
 */
/** Wider rail so marketing creatives read larger on Discover, Feed, map, etc. */
export const FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME =
  'mx-auto w-full max-w-5xl sm:max-w-6xl xl:max-w-7xl 2xl:max-w-[min(100%,80rem)]';

/**
 * Framed marketing ad shell: box-shadow border keeps inner aspect boxes the same size
 * as an unbordered layout. `overflow-hidden` clips creatives to rounded corners; the
 * progress rail sits inside the same frame at the bottom.
 */
export const FEATURE_BANNER_CARD_CLASSNAME =
  'relative overflow-hidden rounded-2xl bg-zinc-950/30 shadow-[0_0_0_1px_rgba(113,113,122,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]';
