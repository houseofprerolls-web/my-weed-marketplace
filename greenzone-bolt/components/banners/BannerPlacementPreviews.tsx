'use client';

import { PLATFORM_AD_PLACEMENTS } from '@/lib/platformAdPlacements';
import { MARKETING_BANNER_SLOT_ASPECT_CLASS } from '@/lib/marketingBanners/creativeFormats';
import { cn } from '@/lib/utils';

function PlacementViewport({ imageUrl }: { imageUrl: string | null }) {
  /** Scaled-down preview matching live 1235×338 (≈3.65:1) slots. */
  return (
    <div className="overflow-hidden rounded-lg bg-zinc-950">
      <div className={cn('relative w-full overflow-hidden bg-background', MARKETING_BANNER_SLOT_ASPECT_CLASS)}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob or remote preview URL
          <img src={imageUrl} alt="" className="h-full w-full object-cover object-center" />
        ) : (
          <div className="flex h-full min-h-[4.5rem] items-center justify-center px-2 text-center text-[10px] leading-snug text-zinc-600 sm:min-h-[3.5rem]">
            Upload an image to preview
          </div>
        )}
      </div>
    </div>
  );
}

export type BannerPlacementPreviewsProps = {
  imageUrl: string | null;
  /** Highlights the row that matches the current / intended placement. */
  emphasizePlacementKey?: string;
  title?: string;
  className?: string;
};

export function BannerPlacementPreviews({
  imageUrl,
  emphasizePlacementKey,
  title = 'Preview on every placement',
  className,
}: BannerPlacementPreviewsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_AD_PLACEMENTS.map((p) => {
          const emphasized = emphasizePlacementKey === p.key;
          return (
            <article
              key={p.key}
              className={cn(
                'min-w-0 rounded-lg border border-white/[0.06] bg-black/30 p-3',
                emphasized && 'ring-2 ring-brand-lime/70 ring-offset-2 ring-offset-zinc-950'
              )}
            >
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                <h4 className="min-w-0 break-words text-xs font-semibold leading-snug text-zinc-200">{p.label}</h4>
                {emphasized ? (
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-brand-lime">
                    Target
                  </span>
                ) : null}
              </div>
              <PlacementViewport imageUrl={imageUrl} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
