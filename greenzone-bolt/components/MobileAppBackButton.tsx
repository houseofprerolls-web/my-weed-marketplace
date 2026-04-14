'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MobileAppBackButtonProps = {
  /** When `router.back()` would no-op, navigate here (direct deep links, new tab, etc.). */
  fallbackHref: string;
  className?: string;
  /** If false, render nothing. */
  when?: boolean;
};

/**
 * History back for touch / tablet layouts. Hidden at `2xl` and up (wide desktop).
 */
export function MobileAppBackButton({
  fallbackHref,
  className,
  when = true,
}: MobileAppBackButtonProps) {
  const router = useRouter();

  if (!when) return null;

  const goBack = () => {
    if (typeof window === 'undefined') {
      router.push(fallbackHref);
      return;
    }
    try {
      const ref = document.referrer;
      const sameOrigin =
        Boolean(ref) &&
        (() => {
          try {
            return new URL(ref).origin === window.location.origin;
          } catch {
            return false;
          }
        })();
      // Fresh load to a deep URL: no same-origin referrer and a single history entry → go to hub.
      if (!sameOrigin && window.history.length <= 1) {
        router.push(fallbackHref);
        return;
      }
    } catch {
      router.push(fallbackHref);
      return;
    }
    router.back();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={goBack}
      className={cn(
        'flex h-11 min-h-11 w-11 min-w-11 shrink-0 text-white hover:bg-brand-red/15 hover:text-white 2xl:hidden',
        'md:h-10 md:w-10 md:min-h-10 md:min-w-10',
        className
      )}
      aria-label="Go back"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </Button>
  );
}
