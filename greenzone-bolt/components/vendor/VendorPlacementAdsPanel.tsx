'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PLATFORM_AD_PLACEMENTS,
  placementDefaultCreativeFormat,
  placementLabel,
} from '@/lib/platformAdPlacements';
import {
  MARKETING_BANNER_CREATIVE_FORMAT_IDS,
  MARKETING_BANNER_CREATIVE_FORMAT_META,
  cropAspectRatioForFormat,
  type MarketingBannerCreativeFormat,
} from '@/lib/marketingBanners/creativeFormats';
import type { HomepageBannerRow } from '@/lib/siteBanners';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { VendorImageFitDialog } from '@/components/vendor/VendorImageFitDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { listingMarketSlugFromZip5 } from '@/lib/listingMarketSlugFromZip5';
import {
  isMarketingBannerImageUrlAllowedForSave,
  marketingBannerImageUrlSaveErrorMessage,
} from '@/lib/marketingBanners/validateImageUrl';
import { MARKETING_BANNER_SLIDES_TABLE } from '@/lib/marketingBanners/table';
import { isMissingCreativeFormatColumnError } from '@/lib/marketingBanners/slideSchema';

const MAX_PENDING_TOTAL = 3;

/** Matches `useToast().toast` signature without importing the hook in this module. */
type VendorToast = (props: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

function rowPlacementKey(row: HomepageBannerRow): string {
  const k = row.placement_key?.trim();
  return k && k.length > 0 ? k : 'homepage_hero';
}

function previewUrlForPlacement(
  key: string,
  banners: HomepageBannerRow[],
  blobByKey: Record<string, string | null>
): string | null {
  const blob = blobByKey[key];
  if (blob) return blob;
  const rows = banners.filter((b) => rowPlacementKey(b) === key);
  const pending = rows.find((b) => b.status === 'pending');
  if (pending) return pending.image_url;
  const approved = rows.find((b) => b.status === 'active');
  return approved?.image_url ?? null;
}

function pendingRowForPlacement(banners: HomepageBannerRow[], key: string): HomepageBannerRow | undefined {
  return banners.find((b) => rowPlacementKey(b) === key && b.status === 'pending');
}

function approvedRowForPlacement(banners: HomepageBannerRow[], key: string): HomepageBannerRow | undefined {
  return banners.find((b) => rowPlacementKey(b) === key && b.status === 'active');
}

type Props = {
  vendorId: string;
  userId: string;
  /** Premise ZIP — scopes new pending rows to the matching listing market when possible. */
  premiseZip?: string | null;
  banners: HomepageBannerRow[];
  onBannersUpdated: () => void;
  toast: VendorToast;
};

export function VendorPlacementAdsPanel({
  vendorId,
  userId,
  premiseZip,
  banners,
  onBannersUpdated,
  toast,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string>(PLATFORM_AD_PLACEMENTS[0]!.key);
  const [blobByKey, setBlobByKey] = useState<Record<string, string | null>>({});
  const [fileByKey, setFileByKey] = useState<Record<string, File | null>>({});
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [vendorCreativeFormat, setVendorCreativeFormat] = useState<MarketingBannerCreativeFormat>(
    () => placementDefaultCreativeFormat(PLATFORM_AD_PLACEMENTS[0]!.key)
  );

  const [fitOpen, setFitOpen] = useState(false);
  const [fitSrc, setFitSrc] = useState<string | null>(null);
  const [fitForKey, setFitForKey] = useState<string | null>(null);
  const [fitFileName, setFitFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickKeyRef = useRef<string | null>(null);

  const pendingTotal = useMemo(() => banners.filter((b) => b.status === 'pending').length, [banners]);

  useEffect(() => {
    setVendorCreativeFormat(placementDefaultCreativeFormat(selectedKey));
  }, [selectedKey]);

  const revokeBlob = useCallback((key: string) => {
    setBlobByKey((prev) => {
      const u = prev[key];
      if (u) URL.revokeObjectURL(u);
      const next = { ...prev, [key]: null };
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(blobByKey).forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
  }, []);

  const openFitForPlacement = useCallback((key: string, file: File) => {
    setFitForKey(key);
    setFitFileName(file.name);
    setFitSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFitOpen(true);
  }, []);

  const onFitOpenChange = useCallback((open: boolean) => {
    setFitOpen(open);
    if (!open) {
      setFitSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setFitForKey(null);
      setFitFileName('');
    }
  }, []);

  const startPickForPlacement = useCallback((key: string) => {
    setSelectedKey(key);
    pickKeyRef.current = key;
    fileInputRef.current?.click();
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      const key = pickKeyRef.current ?? selectedKey;
      e.target.value = '';
      pickKeyRef.current = null;
      if (!f || !key) return;
      openFitForPlacement(key, f);
    },
    [openFitForPlacement, selectedKey]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const file = fileByKey[selectedKey];
      if (!file) {
        toast({ title: 'Choose a photo for this placement', variant: 'destructive' });
        return;
      }
      if (pendingTotal >= MAX_PENDING_TOTAL) {
        toast({
          title: 'Pending limit reached',
          description: `You can have up to ${MAX_PENDING_TOTAL} banner submissions waiting for review. Withdraw one or wait for approval.`,
          variant: 'destructive',
        });
        return;
      }
      if (pendingRowForPlacement(banners, selectedKey)) {
        toast({
          title: 'Already pending',
          description: 'Withdraw your current pending submission for this placement before submitting a new one.',
          variant: 'destructive',
        });
        return;
      }
      setSubmitting(true);
      try {
        const up = await uploadVendorMediaFile(userId, file);
        if ('error' in up) throw new Error(up.error);
        if (!isMarketingBannerImageUrlAllowedForSave(up.url)) {
          throw new Error(marketingBannerImageUrlSaveErrorMessage());
        }
        let listing_market_id: string | null = null;
        const slug = listingMarketSlugFromZip5(premiseZip ?? '');
        if (slug) {
          const { data: lm } = await supabase.from('listing_markets').select('id').eq('slug', slug).maybeSingle();
          listing_market_id = (lm as { id?: string } | null)?.id ?? null;
        }
        const basePayload = {
          vendor_id: vendorId,
          image_url: up.url,
          link_url: linkUrl.trim() || null,
          status: 'pending' as const,
          placement_key: selectedKey,
          listing_market_id,
        };
        let { error } = await supabase
          .from(MARKETING_BANNER_SLIDES_TABLE)
          .insert({ ...basePayload, creative_format: vendorCreativeFormat });
        if (error && isMissingCreativeFormatColumnError(error)) {
          ({ error } = await supabase.from(MARKETING_BANNER_SLIDES_TABLE).insert(basePayload));
        }
        if (error) throw error;
        toast({ title: 'Submitted for review', description: `${placementLabel(selectedKey)} — we will notify you when it is approved.` });
        revokeBlob(selectedKey);
        setFileByKey((prev) => ({ ...prev, [selectedKey]: null }));
        setLinkUrl('');
        onBannersUpdated();
      } catch (err: unknown) {
        toast({
          title: 'Submit failed',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [
      fileByKey,
      selectedKey,
      pendingTotal,
      banners,
      userId,
      vendorId,
      premiseZip,
      linkUrl,
      toast,
      onBannersUpdated,
      revokeBlob,
      vendorCreativeFormat,
    ]
  );

  const withdrawPending = useCallback(
    async (bannerId: string) => {
      const { error } = await supabase.from(MARKETING_BANNER_SLIDES_TABLE).delete().eq('id', bannerId);
      if (error) {
        toast({ title: 'Could not withdraw', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Submission withdrawn' });
      onBannersUpdated();
    },
    [toast, onBannersUpdated]
  );

  return (
    <div className="space-y-6">
      <VendorImageFitDialog
        open={fitOpen}
        onOpenChange={onFitOpenChange}
        imageSrc={fitSrc}
        aspect={cropAspectRatioForFormat(vendorCreativeFormat)}
        title="Position banner art"
        description="Crop to 1235×338 (≈3.65:1), matching live banner slots. Keep important content centered. Drag and zoom, then apply."
        maxOutputLongEdge={2600}
        outputBaseName={fitFileName}
        onApply={(file) => {
          const key = fitForKey;
          if (!key) return;
          revokeBlob(key);
          const url = URL.createObjectURL(file);
          setBlobByKey((prev) => ({ ...prev, [key]: url }));
          setFileByKey((prev) => ({ ...prev, [key]: file }));
          setSelectedKey(key);
        }}
      />

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInputChange} />

      <p className="text-sm text-gray-400">
        Each placement can use its own creative. Click a slot to select it, then <strong className="text-gray-300">Add photo</strong>{' '}
        on that card (or below) to upload. Submitting sends <em>only</em> the selected placement for review. Live ads still
        require admin approval.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_AD_PLACEMENTS.map((p) => {
          const selected = selectedKey === p.key;
          const preview = previewUrlForPlacement(p.key, banners, blobByKey);
          const pending = pendingRowForPlacement(banners, p.key);
          const approved = approvedRowForPlacement(banners, p.key);
          return (
            <article
              key={p.key}
              className={cn(
                'rounded-xl border border-white/[0.08] bg-black/30 p-3 transition',
                selected && 'ring-2 ring-brand-lime/70 ring-offset-2 ring-offset-black'
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedKey(p.key)}
                className="w-full text-left"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                  <h4 className="text-xs font-semibold text-zinc-200">{p.label}</h4>
                  {selected ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-brand-lime">Selected</span>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded-xl bg-zinc-950">
                  <div className="relative h-[min(22vw,92px)] w-full overflow-hidden bg-background sm:h-[104px]">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="" className="h-full w-full object-cover object-center" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] leading-snug text-zinc-600">
                        No photo for this slot
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {pending ? (
                    <Badge variant="outline" className="border-amber-600 text-amber-200">
                      Pending
                    </Badge>
                  ) : null}
                  {approved ? (
                    <Badge variant="outline" className="border-green-600 text-green-400">
                      Live
                    </Badge>
                  ) : null}
                </div>
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 bg-zinc-800 text-xs text-white hover:bg-zinc-700"
                  onClick={() => startPickForPlacement(p.key)}
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  Add photo
                </Button>
                {pending ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-red-400 hover:text-red-300"
                    onClick={() => withdrawPending(pending.id)}
                  >
                    Withdraw
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <Card className="border-green-900/25 bg-gray-900/50 p-6">
        <h3 className="mb-1 text-lg font-semibold text-white">Submit for review</h3>
        <p className="mb-4 text-sm text-gray-500">
          Placement: <span className="text-gray-300">{placementLabel(selectedKey)}</span>
          {fileByKey[selectedKey] ? (
            <span className="text-green-400"> — draft image ready</span>
          ) : (
            <span className="text-amber-200/80"> — add a photo above</span>
          )}
        </p>
        {pendingTotal >= MAX_PENDING_TOTAL ? (
          <p className="text-sm text-amber-200/90">
            You already have {MAX_PENDING_TOTAL} pending submissions. Withdraw one or wait for review before adding more.
          </p>
        ) : pendingRowForPlacement(banners, selectedKey) ? (
          <p className="text-sm text-amber-200/90">
            This placement already has a pending submission. Withdraw it on the card if you want to replace it.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-green-700 text-green-200"
                onClick={() => startPickForPlacement(selectedKey)}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Choose image for this placement
              </Button>
            </div>
            <div>
              <Label className="text-gray-300">Click-through URL (optional)</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://… (optional — defaults to your listing)"
                className="mt-1 border-green-900/40 bg-gray-950 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <Label className="text-gray-300">Creative format</Label>
              <Select
                value={vendorCreativeFormat}
                onValueChange={(v: string) =>
                  setVendorCreativeFormat(v as MarketingBannerCreativeFormat)
                }
              >
                <SelectTrigger className="mt-1 border-green-900/40 bg-gray-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[min(70vh,32rem)] min-w-[max(var(--radix-select-trigger-width),16rem)]">
                  {MARKETING_BANNER_CREATIVE_FORMAT_IDS.map((id) => {
                    const m = MARKETING_BANNER_CREATIVE_FORMAT_META[id];
                    return (
                      <SelectItem key={id} value={id} textValue={`${m.label} ${m.sizeLabel}`}>
                        <span className="flex flex-col gap-0.5 text-left">
                          <span className="font-medium">{m.label}</span>
                          <span className="text-[11px] text-muted-foreground">{m.sizeLabel}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting || !fileByKey[selectedKey]} className="bg-green-600 hover:bg-green-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Submit ${placementLabel(selectedKey)}`}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
