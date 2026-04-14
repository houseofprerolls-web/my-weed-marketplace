'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  GEO_ZIP_PROMPT_KEY,
} from '@/components/auth/GeoZipPromptAfterAge';
import { SHOPPER_ZIP_STORAGE_KEY } from '@/lib/shopperLocation';
import {
  isMobileUserAgent,
  isStandaloneDisplayMode,
  isWithinPwaLoyaltySignupWindow,
} from '@/lib/pwaHomescreenPrompt';

function geoZipGateCleared(): boolean {
  try {
    if (localStorage.getItem(GEO_ZIP_PROMPT_KEY) === 'true') return true;
    const z = localStorage.getItem(SHOPPER_ZIP_STORAGE_KEY);
    return Boolean(z && z.trim() !== '');
  } catch {
    return true;
  }
}

function ageGateCleared(): boolean {
  try {
    return localStorage.getItem('age_verified') === 'true';
  } catch {
    return false;
  }
}

export function PwaHomescreenLoyaltyPrompt() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { isCustomer, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [geoGateEpoch, setGeoGateEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setGeoGateEpoch((n) => n + 1);
    window.addEventListener('datreehouse:geo_zip_prompt_done', bump);
    window.addEventListener('datreehouse:age_verified', bump);
    return () => {
      window.removeEventListener('datreehouse:geo_zip_prompt_done', bump);
      window.removeEventListener('datreehouse:age_verified', bump);
    };
  }, []);

  const eligible = useMemo(() => {
    if (!isSupabaseConfigured || authLoading || roleLoading) return false;
    if (!user || !profile) return false;
    if (!isCustomer) return false;
    if (!isMobileUserAgent()) return false;
    if (!ageGateCleared()) return false;
    if (!geoZipGateCleared()) return false;
    if (!isWithinPwaLoyaltySignupWindow(profile.created_at)) return false;
    if (profile.pwa_homescreen_loyalty_claimed_at) return false;
    if (profile.pwa_homescreen_loyalty_dismissed_at) return false;
    return true;
  }, [authLoading, roleLoading, user, profile, isCustomer]);

  useEffect(() => {
    if (!eligible) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [eligible]);

  const dismiss = useCallback(async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('datreehouse_dismiss_pwa_homescreen_loyalty');
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'No problem', description: 'You can install the app anytime from your browser menu.' });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not save preference',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }, [refreshProfile, toast]);

  const claim = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('datreehouse_claim_pwa_homescreen_loyalty');
      if (error) throw error;
      const row = data as { ok?: boolean; reason?: string; points?: number } | null;
      if (!row?.ok) {
        const reason = row?.reason ?? 'unknown';
        if (reason === 'already_claimed') {
          toast({ title: 'Already credited', description: 'These points were already added to your account.' });
        } else if (reason === 'customers_only') {
          toast({ title: 'Offer not available', description: 'This reward is for shopper accounts.' });
        } else if (reason === 'signup_window_closed') {
          toast({
            title: 'Offer expired',
            description: 'This welcome bonus is only for accounts created in the last 90 days.',
          });
        } else {
          toast({ title: 'Could not add points', description: 'Try again or contact support.', variant: 'destructive' });
        }
        await refreshProfile();
        setOpen(false);
        return;
      }
      await refreshProfile();
      toast({
        title: '50 loyalty points added',
        description: 'Thanks for keeping Da Treehouse on your home screen. Check the gift icon for your balance.',
      });
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not add points',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }, [refreshProfile, toast]);

  if (!open) return null;

  const inStandalone = isStandaloneDisplayMode();

  return (
    <div
      className="fixed inset-0 z-[615] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-loyalty-title"
    >
      <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto border-brand-lime/25 bg-zinc-950 p-6 shadow-2xl ring-1 ring-sky-900/40">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-900/40 text-emerald-300">
            <Gift className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="pwa-loyalty-title" className="text-xl font-bold text-white">
              Add Da Treehouse to your home screen
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {inStandalone ? (
                <>
                  You are already using the installed app. Tap <span className="font-medium text-zinc-200">Confirm</span> to claim{' '}
                  <span className="font-medium text-emerald-300">50 free loyalty points</span> on your shopper account (one time).
                </>
              ) : (
                <>
                  Install our web app for a faster shortcut. After you add it, tap <span className="font-medium text-zinc-200">Confirm</span>{' '}
                  and we will credit <span className="font-medium text-emerald-300">50 free loyalty points</span> to your shopper account
                  (one time).
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {inStandalone ? null : (
            <>
          <div className="rounded-lg border border-zinc-800 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">iPhone / iPad (Safari)</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-300">
              <li>Open this site in <strong className="text-white">Safari</strong> (not the in-app browser if possible).</li>
              <li>
                Tap the <strong className="text-white">Share</strong> button <span className="text-zinc-500">(square with arrow up)</span>.
              </li>
              <li>
                Scroll down and tap <strong className="text-white">Add to Home Screen</strong>, then <strong className="text-white">Add</strong>.
              </li>
              <li>Open the new home screen icon, sign in if needed, then return here and tap Confirm below.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">Android (Chrome)</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-300">
              <li>
                Tap the <strong className="text-white">⋮</strong> menu (three dots) in the top-right of Chrome.
              </li>
              <li>
                Tap <strong className="text-white">Add to Home screen</strong> or <strong className="text-white">Install app</strong>, then confirm.
              </li>
              <li>Launch the shortcut from your home screen, then come back and tap Confirm below.</li>
            </ol>
          </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-row-reverse">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void claim()}
            className="inline-flex flex-1 items-center justify-center bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Claiming…
              </>
            ) : (
              'Confirm — I added it'
            )}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void dismiss()} className="flex-1 border-zinc-600 text-zinc-200 hover:bg-zinc-900">
            No thanks
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Points are for loyalty rewards in the gift menu. Misuse may be reversed by support.
        </p>
      </Card>
    </div>
  );
}
