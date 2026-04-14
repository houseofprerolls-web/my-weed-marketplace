'use client';

import { useCallback, useEffect, useState } from 'react';
import { VendorNav } from '@/components/vendor/VendorNav';
import { VendorPlacementAdsPanel } from '@/components/vendor/VendorPlacementAdsPanel';
import { Loader2, Megaphone } from 'lucide-react';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { HomepageBannerRow } from '@/lib/siteBanners';
import { MARKETING_BANNER_SLIDES_TABLE } from '@/lib/marketingBanners/table';
import {
  MARKETING_SLIDE_SELECT_BASE,
  MARKETING_SLIDE_SELECT_FULL,
  isMissingCreativeFormatColumnError,
} from '@/lib/marketingBanners/slideSchema';

export default function VendorSponsoredAdsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const [myBanners, setMyBanners] = useState<HomepageBannerRow[]>([]);

  const loadBanners = useCallback(async () => {
    if (!vendor?.id || vendor?.smokers_club_eligible !== true) {
      setMyBanners([]);
      return;
    }
    const first = await supabase
      .from(MARKETING_BANNER_SLIDES_TABLE)
      .select(MARKETING_SLIDE_SELECT_FULL)
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });
    let raw: unknown = first.data;
    let error = first.error;
    if (error && isMissingCreativeFormatColumnError(error)) {
      const second = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .select(MARKETING_SLIDE_SELECT_BASE)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      raw = second.data;
      error = second.error;
    }
    if (error) {
      toast({ title: 'Could not load your ads', description: error.message, variant: 'destructive' });
      setMyBanners([]);
      return;
    }
    setMyBanners(
      ((raw ?? []) as unknown as HomepageBannerRow[]).map((r) => ({
        ...r,
        creative_format: r.creative_format ?? 'leaderboard',
      }))
    );
  }, [vendor?.id, vendor?.smokers_club_eligible, toast]);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell || !vendorsMode || !vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-white">
        <p className="text-gray-400">Sign in with a linked dispensary to manage sponsored ads.</p>
      </div>
    );
  }

  const eligible = vendor.smokers_club_eligible === true;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-8 flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-600/20 text-brand-lime">
              <Megaphone className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="mb-2 text-3xl font-bold lowercase md:normal-case">Sponsored ads</h1>
              <p className="max-w-3xl text-gray-400">
                Upload different art per page placement (homepage hero, Smokers Club strip, Discover, Deals, and more).
                Pick a slot in the grid, add a photo, then submit for that placement only. Nothing goes live until our
                team approves it. Export at 1235×338 (≈3.65:1 wide banner); live slots keep that aspect everywhere — keep
                logos and text centered.
              </p>
            </div>
          </div>

          {!eligible ? (
            <p className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-100/90">
              Sponsored banner submissions are available once your shop is marked Smokers Club–eligible. Request access from{' '}
              <a href="/vendor/advertising" className="text-amber-300 underline hover:text-amber-200">
                Smokers club
              </a>
              .
            </p>
          ) : user.id ? (
            <VendorPlacementAdsPanel
              vendorId={vendor.id}
              userId={user.id}
              premiseZip={vendor.zip}
              banners={myBanners}
              onBannersUpdated={() => void loadBanners()}
              toast={toast}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
