'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { mergeMenuImageCandidates } from '@/lib/strainProductImage';
import { SITE_NAME } from '@/lib/brand';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { StrainImageWhiteToAlpha } from '@/components/strains/StrainImageWhiteToAlpha';
import { cn } from '@/lib/utils';

const TREEHOUSE_LOGO = '/brand/datreehouse-logo.png';

function TreehouseNoPhotoFallback({ tone }: { tone: 'dark' | 'light' }) {
  const shell =
    tone === 'light'
      ? 'bg-gradient-to-br from-emerald-50/95 via-slate-50 to-slate-100'
      : 'bg-background';
  return (
    <div className={cn('flex h-full w-full items-center justify-center px-2', shell)}>
      <Image
        src={TREEHOUSE_LOGO}
        alt={SITE_NAME}
        width={1024}
        height={1024}
        className={cn(
          'h-auto object-contain opacity-95',
          tone === 'light'
            ? 'w-[min(11rem,78%)] max-h-[68%]'
            : 'w-[min(5.5rem,48%)] max-h-[38%]'
        )}
      />
    </div>
  );
}

type Props = {
  slug: string;
  imageUrl: string | null | undefined;
  /** Tried first (e.g. product.images[0]); on load error we fall back to strain + Leafly URLs. */
  preferredUrl?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** When omitted, shows the DaTreehouse treehouse logo after all image URLs fail. */
  placeholder?: ReactNode;
  /** Background behind the logo when using the default treehouse fallback. */
  fallbackTone?: 'dark' | 'light';
  /**
   * Cap how many URLs we try on `onError` (each 404 waits on the network).
   * Omit on strain detail pages; use ~6 on menus/grids.
   */
  maxCandidates?: number;
  /** Full Leafly URL matrix (strain encyclopedia detail page only). */
  strainDetailPage?: boolean;
  /**
   * `contain` fits the whole image on a black field with a faint treehouse watermark.
   * `cover` fills the frame (default — menus, admin thumbs).
   */
  photoFit?: 'cover' | 'contain';
  /**
   * Strip near-white pixels to transparency (canvas). `auto` enables only when `photoFit="contain"`
   * (strain directory + detail) so menus/admin thumbs stay fast and CORS-simple.
   */
  removeWhiteBackdrop?: boolean | 'auto';
  /** Small Treehouse mark when a real photo is showing (strain encyclopedia / admin). */
  cornerBrandMark?: boolean;
  cornerBrandSize?: 'sm' | 'md';
};

export function StrainHeroImage({
  slug,
  imageUrl,
  preferredUrl,
  alt,
  className,
  imgClassName = 'h-full w-full object-cover',
  placeholder,
  fallbackTone = 'dark',
  maxCandidates,
  strainDetailPage = false,
  photoFit = 'cover',
  removeWhiteBackdrop = 'auto',
  cornerBrandMark = false,
  cornerBrandSize = 'md',
}: Props) {
  const candidates = useMemo(() => {
    const full = mergeMenuImageCandidates(preferredUrl ?? null, imageUrl, slug, {
      strainDetailPage,
    });
    if (typeof maxCandidates === 'number' && maxCandidates > 0 && full.length > maxCandidates) {
      return full.slice(0, maxCandidates);
    }
    return full;
  }, [preferredUrl, imageUrl, slug, maxCandidates, strainDetailPage]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [preferredUrl, imageUrl, slug]);

  const resolvedImgClassName =
    photoFit === 'contain'
      ? 'relative z-[1] h-full w-full object-contain object-center'
      : imgClassName;

  const useWhiteRemoval =
    removeWhiteBackdrop === 'auto' ? photoFit === 'contain' : Boolean(removeWhiteBackdrop);

  if (idx >= candidates.length) {
    return (
      <div className={cn(photoFit === 'contain' && 'bg-background', className)}>
        {placeholder ?? <TreehouseNoPhotoFallback tone={fallbackTone} />}
      </div>
    );
  }

  return (
    <div className={cn(photoFit === 'contain' && 'relative bg-background', className)}>
      {photoFit === 'contain' ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
          aria-hidden
        >
          <Image
            src={TREEHOUSE_LOGO}
            alt=""
            width={200}
            height={100}
            className="h-auto w-[clamp(2.75rem,16%,4.5rem)] max-h-[26%] object-contain opacity-[0.11]"
          />
        </div>
      ) : null}
      {cornerBrandMark ? (
        <div
          className="pointer-events-none absolute right-1.5 top-1.5 z-[8] rounded-md bg-black/55 px-1 py-0.5 shadow-md ring-1 ring-white/15 backdrop-blur-sm sm:right-2 sm:top-2"
          aria-hidden
        >
          <Image
            src={TREEHOUSE_LOGO}
            alt=""
            width={160}
            height={80}
            className={cn(
              'h-auto w-auto object-contain opacity-[0.95]',
              cornerBrandSize === 'sm'
                ? 'max-h-3 max-w-[2.5rem]'
                : 'max-h-[1.15rem] max-w-[3.25rem] sm:max-h-5 sm:max-w-[4rem]'
            )}
          />
        </div>
      ) : null}
      {useWhiteRemoval ? (
        <StrainImageWhiteToAlpha
          src={candidates[idx]}
          alt={alt}
          className={resolvedImgClassName}
          loading={strainDetailPage ? 'eager' : 'lazy'}
          decoding="async"
          maxProcessSide={strainDetailPage ? 2048 : 1280}
          onLoadFailure={() => setIdx((i) => i + 1)}
        />
      ) : (
        <OptimizedImg
          src={candidates[idx]}
          alt={alt}
          className={resolvedImgClassName}
          loading={strainDetailPage ? 'eager' : 'lazy'}
          decoding="async"
          preset={strainDetailPage ? 'hero' : 'card'}
          onError={() => setIdx((i) => i + 1)}
        />
      )}
    </div>
  );
}
