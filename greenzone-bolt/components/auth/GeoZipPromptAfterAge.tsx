'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { resolveZipFromBrowserLocation } from '@/lib/geoZip';
import { persistShopperZip, SHOPPER_ZIP_STORAGE_KEY } from '@/lib/shopperLocation';
import { extractZip5 } from '@/lib/zipUtils';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';

/** Cleared after user accepts or dismisses the post-age ZIP prompt (used by other onboarding modals). */
export const GEO_ZIP_PROMPT_KEY = 'geo_zip_prompted_after_age_v1';

export function GeoZipPromptAfterAge() {
  const { isCustomer, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const shouldShow = useMemo(() => {
    if (roleLoading || !isCustomer) return false;
    try {
      const ageVerified = localStorage.getItem('age_verified') === 'true';
      if (!ageVerified) return false;

      const prompted = localStorage.getItem(GEO_ZIP_PROMPT_KEY) === 'true';
      if (prompted) return false;

      const storedZipRaw = localStorage.getItem(SHOPPER_ZIP_STORAGE_KEY);
      const hasStoredZip = Boolean(storedZipRaw && storedZipRaw.trim() !== '');
      if (hasStoredZip) return false;

      return true;
    } catch {
      // If storage is blocked, don't block the user with this prompt.
      return false;
    }
  }, [isCustomer, roleLoading]);

  useEffect(() => {
    const maybeOpen = () => {
      if (shouldShow) setOpen(true);
    };

    maybeOpen();
    window.addEventListener('datreehouse:age_verified', maybeOpen);
    return () => window.removeEventListener('datreehouse:age_verified', maybeOpen);
  }, [shouldShow]);

  const dismiss = () => {
    try {
      localStorage.setItem(GEO_ZIP_PROMPT_KEY, 'true');
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('datreehouse:geo_zip_prompt_done'));
    }
    setOpen(false);
  };

  const accept = async () => {
    try {
      localStorage.setItem(GEO_ZIP_PROMPT_KEY, 'true');
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('datreehouse:geo_zip_prompt_done'));
    }
    setOpen(false);
    try {
      toast({ title: 'Using your location…', description: 'Requesting permission in your browser.' });
      const zip = await resolveZipFromBrowserLocation();
      const zip5 = extractZip5(zip) ?? FALLBACK_LA_ZIP;
      persistShopperZip(zip5);
      toast({ title: 'ZIP updated', description: `Showing stores for ${zip5}.` });
    } catch {
      toast({
        title: 'Could not get location',
        description: `We’ll keep using ${FALLBACK_LA_ZIP}. You can edit ZIP in the header.`,
        variant: 'destructive',
      });
      persistShopperZip(FALLBACK_LA_ZIP);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[620] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="geo-zip-prompt-title"
    >
      <Card className="w-full max-w-md border-brand-red/30 bg-zinc-950 p-6 shadow-2xl ring-1 ring-brand-lime/30">
        <h2 id="geo-zip-prompt-title" className="text-2xl font-bold text-white">
          Use your location?
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Turn on location to auto-set your ZIP code, so we can show dispensaries enabled for your area.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => void accept()} className="flex-1 bg-brand-red text-white hover:bg-brand-red-deep">
            Allow location
          </Button>
          <Button type="button" variant="outline" onClick={dismiss} className="flex-1 border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800">
            Enter ZIP instead
          </Button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          You can always update ZIP using the bar under the main menu.
        </p>
      </Card>
    </div>
  );
}

