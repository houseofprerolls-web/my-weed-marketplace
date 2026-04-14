'use client';

import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import {
  hasSupabaseTransformVariant,
  optimizedImageUrl,
  sanitizeDisplayImageUrl,
  type ImageOptimizePreset,
} from '@/lib/optimizedImageUrl';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  alt: string;
  preset?: ImageOptimizePreset;
};

/**
 * Tries a Supabase-transformed URL first (smaller payload), falls back to the original src on error.
 */
export function OptimizedImg({
  src,
  alt,
  preset = 'card',
  className,
  onError,
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: Props) {
  const [useOriginal, setUseOriginal] = useState(false);

  useEffect(() => {
    setUseOriginal(false);
  }, [src, preset]);

  const displaySrc = useMemo(() => {
    const cleaned = sanitizeDisplayImageUrl(src);
    if (useOriginal) return cleaned;
    return optimizedImageUrl(cleaned, preset);
  }, [src, preset, useOriginal]);

  const canTryTransform = hasSupabaseTransformVariant(src);

  return (
    <img
      {...rest}
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        if (canTryTransform && !useOriginal) {
          setUseOriginal(true);
          return;
        }
        onError?.(e);
      }}
    />
  );
}
