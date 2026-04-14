'use client';

import { cn } from '@/lib/utils';
import type { PlatformPlacementKey } from '@/lib/platformAdPlacements';
import { SiteBannerCarousel } from '@/components/home/SiteBannerCarousel';

type Props = {
  placementKey: PlatformPlacementKey | string;
  className?: string;
  /** Eyebrow above the strip (default “Sponsored”). */
  stripLabel?: string;
  /** Tighter chrome on phones: slimmer label spacing (e.g. Discover). */
  compactStripChrome?: boolean;
};

/** Compact sponsored strip for discover, deals, map, etc. Pulls `placement_key` from admin-configured slides. */
export function PlatformAdSlot({ placementKey, className, stripLabel, compactStripChrome }: Props) {
  return (
    <div className={cn('w-full', className)}>
      <SiteBannerCarousel
        variant="treeTop"
        placementKey={placementKey}
        stripLabel={stripLabel ?? 'Sponsored'}
        compactStripChrome={compactStripChrome}
      />
    </div>
  );
}
