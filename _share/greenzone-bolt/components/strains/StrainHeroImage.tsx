'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { strainImageCandidates } from '@/lib/leaflyStrainImage';
import { SITE_NAME } from '@/lib/brand';

const TREEHOUSE_LOGO = '/brand/datreehouse-logo.png';

function TreehouseNoPhotoFallback({ tone }: { tone: 'dark' | 'light' }) {
  const shell =
    tone === 'light'
      ? 'bg-gradient-to-br from-emerald-50/95 via-slate-50 to-slate-100'
      : 'bg-gradient-to-br from-green-950/45 via-black to-black';
  return (
    <div className={`flex h-full w-full items-center justify-center px-2 ${shell}`}>
      <Image
        src={TREEHOUSE_LOGO}
        alt={SITE_NAME}
        width={320}
        height={160}
        className="h-auto w-[min(11rem,78%)] max-h-[68%] object-contain opacity-95"
      />
    </div>
  );
}

type Props = {
  slug: string;
  imageUrl: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** When omitted, shows the DaTreehouse treehouse logo after all image URLs fail. */
  placeholder?: ReactNode;
  /** Background behind the logo when using the default treehouse fallback. */
  fallbackTone?: 'dark' | 'light';
};

export function StrainHeroImage({
  slug,
  imageUrl,
  alt,
  className,
  imgClassName = 'h-full w-full object-cover',
  placeholder,
  fallbackTone = 'dark',
}: Props) {
  const candidates = useMemo(() => strainImageCandidates(imageUrl, slug), [imageUrl, slug]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [imageUrl, slug]);

  if (idx >= candidates.length) {
    return (
      <div className={className}>
        {placeholder ?? <TreehouseNoPhotoFallback tone={fallbackTone} />}
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={candidates[idx]}
        alt={alt}
        className={imgClassName}
        onError={() => setIdx((i) => i + 1)}
      />
    </div>
  );
}
