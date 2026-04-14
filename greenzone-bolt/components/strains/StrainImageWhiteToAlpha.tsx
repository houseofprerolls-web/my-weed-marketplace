'use client';

import { useEffect, useRef, useState } from 'react';

/** Per-channel headroom from 255; higher = more aggressive (removes more off-white). */
const DEFAULT_THRESHOLD = 48;

function sameSiteImageSrc(absoluteSrc: string, pageOrigin: string): boolean {
  try {
    const u = new URL(absoluteSrc, pageOrigin);
    return u.origin === pageOrigin;
  } catch {
    return false;
  }
}

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
  /**
   * Pixels where R,G,B are all within this distance of 255 become fully transparent.
   */
  threshold?: number;
  /** Network decode failure or zero-size image — try next URL upstream. */
  onLoadFailure?: () => void;
  /** Longest edge for canvas work (smaller = faster on dense grids). */
  maxProcessSide?: number;
};

/**
 * Client-side: near-white backdrop → alpha 0 so buds show on dark mattes.
 * If CORS blocks canvas read (tainted), falls back to the original `src` (white may remain).
 */
export function StrainImageWhiteToAlpha({
  src,
  alt,
  className,
  loading = 'lazy',
  decoding = 'async',
  threshold = DEFAULT_THRESHOLD,
  onLoadFailure,
  maxProcessSide = 2048,
}: Props) {
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const tokenRef = useRef(0);
  const blobUrlRef = useRef<string | null>(null);
  const onFailRef = useRef(onLoadFailure);
  onFailRef.current = onLoadFailure;

  const revokeBlob = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    const token = ++tokenRef.current;
    setPngUrl(null);
    revokeBlob();

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const needsProxy =
      typeof window !== 'undefined' &&
      !src.startsWith('blob:') &&
      !src.startsWith('data:') &&
      !sameSiteImageSrc(src, origin);

    let loadAttempt: 'proxy' | 'direct' = needsProxy ? 'proxy' : 'direct';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (token !== tokenRef.current) return;
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w < 1 || h < 1) {
          onFailRef.current?.();
          return;
        }
        let tw = w;
        let th = h;
        const max = Math.max(w, h);
        if (max > maxProcessSide) {
          const s = maxProcessSide / max;
          tw = Math.round(w * s);
          th = Math.round(h * s);
        }
        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          return;
        }
        ctx.drawImage(img, 0, 0, tw, th);
        const imageData = ctx.getImageData(0, 0, tw, th);
        const d = imageData.data;
        const t = threshold;
        const strictFloor = 255 - t;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const minv = Math.min(r, g, b);
          const maxv = Math.max(r, g, b);
          const delta = maxv - minv;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          // 1) Classic studio white (all channels high)
          const strictWhite = r >= strictFloor && g >= strictFloor && b >= strictFloor;
          // 2) Off-white / light gray backdrops (high brightness, low chroma — keeps saturated bud pixels)
          const chromaCap = Math.max(20, Math.round(t * 0.62));
          const lightBackdrop =
            lum >= 255 - t * 1.05 && delta <= chromaCap && minv >= 255 - t * 1.28;
          if (strictWhite || lightBackdrop) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (token !== tokenRef.current) return;
            if (!blob) return;
            revokeBlob();
            const url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
            setPngUrl(url);
          },
          'image/png',
          0.92
        );
      } catch {
        /* CORS taint or other — keep showing original `src` below */
        if (token !== tokenRef.current) return;
      }
    };
    img.onerror = () => {
      if (token !== tokenRef.current) return;
      if (loadAttempt === 'proxy') {
        loadAttempt = 'direct';
        img.src = src;
        return;
      }
      onFailRef.current?.();
    };

    if (needsProxy && origin) {
      img.src = `${origin}/api/strain-image-proxy?url=${encodeURIComponent(src)}`;
    } else {
      img.src = src;
    }

    return () => {
      tokenRef.current++;
      revokeBlob();
    };
  }, [src, threshold, maxProcessSide]);

  const displaySrc = pngUrl ?? src;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={() => {
        if (!pngUrl) {
          onLoadFailure?.();
        }
      }}
    />
  );
}
