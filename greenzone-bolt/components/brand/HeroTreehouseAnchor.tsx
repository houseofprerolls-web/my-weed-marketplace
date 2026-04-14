'use client';

import Image from 'next/image';
import { SITE_NAME } from '@/lib/brand';

/**
 * Large focal logo — visual anchor for the home hero (treehouse mark + wordmark).
 */
export function HeroTreehouseAnchor() {
  return (
    <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center px-4">
      {/* Ambient glow behind mark */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-red/25 blur-[80px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-lime/15 blur-[60px]"
        aria-hidden
      />

      <div className="relative">
        <div
          className="absolute -inset-3 rounded-[2rem] bg-gradient-to-b from-brand-lime/25 via-brand-red/10 to-transparent opacity-90 blur-md"
          aria-hidden
        />
        <div
          className="absolute -inset-1 rounded-[1.75rem] ring-2 ring-white/10 ring-offset-2 ring-offset-black"
          aria-hidden
        />
        <Image
          src="/brand/datreehouse-logo.png"
          alt={SITE_NAME}
          width={1024}
          height={1024}
          priority
          className="relative h-28 w-auto object-contain object-top drop-shadow-[0_0_28px_rgba(229,9,20,0.35)] sm:h-36 md:h-44"
        />
      </div>
    </div>
  );
}
