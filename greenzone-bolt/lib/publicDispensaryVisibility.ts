/**
 * Public surfaces: prefer Smokers Club–eligible directory vendors, but still show others when
 * they are plausibly "near" the shopper (distance), deliver to their ZIP, or (map only) sit in the
 * current map viewport.
 */

export const PUBLIC_DISPENSARY_NEARBY_MILES = 15;

export type PublicDispensaryVisibilityCtx = {
  /** Great-circle miles from shopper anchor; omit when unknown */
  distanceMiles?: number | null;
  /** When set, non-eligible vendors within this many miles stay visible (defaults to PUBLIC_DISPENSARY_NEARBY_MILES). */
  maxDistanceMiles?: number;
  /** True when vendor has delivery coverage for the shopper’s saved ZIP */
  inDeliveryZipCoverage?: boolean;
  /** Map: pin lies inside the live viewport bounds */
  inMapViewport?: boolean;
};

export function publicDispensarySurfaceVisible(
  smokersClubEligible: boolean,
  ctx: PublicDispensaryVisibilityCtx
): boolean {
  if (smokersClubEligible) return true;
  if (ctx.inDeliveryZipCoverage) return true;
  const cap = ctx.maxDistanceMiles ?? PUBLIC_DISPENSARY_NEARBY_MILES;
  const d = ctx.distanceMiles;
  if (d != null && Number.isFinite(d) && d <= cap) return true;
  if (ctx.inMapViewport) return true;
  return false;
}
