import { PLATFORM_AD_PLACEMENTS, type PlatformPlacementKey } from '@/lib/platformAdPlacements';

const ALLOWED = new Set<string>(PLATFORM_AD_PLACEMENTS.map((p) => p.key));

export function isAllowedMarketingPlacementKey(key: string): key is PlatformPlacementKey {
  return ALLOWED.has(key);
}

export function allowedMarketingPlacementKeys(): readonly string[] {
  return PLATFORM_AD_PLACEMENTS.map((p) => p.key);
}
