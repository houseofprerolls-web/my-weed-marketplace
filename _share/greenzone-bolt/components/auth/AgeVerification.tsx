'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';

const skipAgeGate =
  typeof process.env.NEXT_PUBLIC_SKIP_AGE_GATE === 'string' &&
  process.env.NEXT_PUBLIC_SKIP_AGE_GATE === '1';

/**
 * Full-screen gate (no Radix Dialog) so local/dev browsers never get stuck with an invisible modal
 * on top of a dark overlay.
 */
export function AgeVerification() {
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    if (skipAgeGate) {
      try {
        if (!localStorage.getItem('age_verified')) localStorage.setItem('age_verified', 'true');
        window.dispatchEvent(new CustomEvent('datreehouse:age_verified', { detail: { skipped: true } }));
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      if (!localStorage.getItem('age_verified')) {
        setShowGate(true);
      }
    } catch {
      setShowGate(true);
    }
  }, []);

  const handleVerify = (isOver21: boolean) => {
    if (isOver21) {
      try {
        localStorage.setItem('age_verified', 'true');
        window.dispatchEvent(new CustomEvent('datreehouse:age_verified', { detail: { skipped: false } }));
      } catch {
        /* private / blocked storage */
      }
      setShowGate(false);
    } else {
      window.location.href = 'https://www.google.com';
    }
  };

  if (!showGate) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-verification-title"
    >
      <div className="w-full max-w-md rounded-xl border-2 border-brand-red bg-zinc-950 p-6 shadow-2xl ring-1 ring-brand-lime/30">
        <div className="flex flex-col items-center space-y-6 py-2 text-center">
          <div className="rounded-full bg-brand-red p-4 ring-2 ring-brand-lime/40">
            <Leaf className="h-12 w-12 text-white" aria-hidden />
          </div>

          <div>
            <h2 id="age-verification-title" className="mb-2 text-3xl font-bold text-white">
              Age verification
            </h2>
            <p className="text-gray-400">This website contains cannabis-related content.</p>
          </div>

          <div className="w-full space-y-3">
            <p className="text-lg font-semibold text-white">Are you 21 years or older?</p>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => handleVerify(true)}
                className="h-12 flex-1 bg-brand-red text-lg text-white hover:bg-brand-red-deep"
              >
                Yes, I&apos;m 21+
              </Button>
              <Button
                type="button"
                onClick={() => handleVerify(false)}
                variant="outline"
                className="h-12 flex-1 border-gray-500 text-gray-300 hover:bg-white/10 hover:text-white"
              >
                No
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            By entering this site, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
