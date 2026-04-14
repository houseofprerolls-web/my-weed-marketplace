'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import VendorNav from '@/components/vendor/VendorNav';
import { Loader2, Palette, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { supabase } from '@/lib/supabase';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { useToast } from '@/hooks/use-toast';
import {
  clampSkuCardOverlay,
  normalizeSkuCardPreset,
  resolveSkuCardTheme,
  resolveStoreListingCardTheme,
  type SkuCardPreset,
} from '@/lib/vendorSkuCardTheme';
import { VendorSkuCardFrame } from '@/components/vendor/VendorSkuCardFrame';
import { ProductBrandCardChip } from '@/components/product/ProductThumbnailBrandTab';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VendorImageFitDialog } from '@/components/vendor/VendorImageFitDialog';

const INHERIT_STORE = '__inherit__' as const;

const PRESET_OPTIONS: { value: SkuCardPreset; label: string; hint: string }[] = [
  { value: 'default', label: 'Da Treehouse default', hint: 'Dark green gradient — matches the platform menu.' },
  { value: 'dark_glass', label: 'Dark glass', hint: 'Frosted glass look on dark.' },
  { value: 'forest', label: 'Forest', hint: 'Emerald-tinted gradient.' },
  { value: 'ember', label: 'Ember', hint: 'Warm orange accent gradient.' },
  { value: 'custom', label: 'Custom photo', hint: 'Your full-card background image + adjustable dimming.' },
];

export default function VendorListingDesignPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, refresh, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const { toast } = useToast();

  const [preset, setPreset] = useState<SkuCardPreset>('default');
  const [bgUrl, setBgUrl] = useState('');
  const [overlay, setOverlay] = useState(50);
  const [storePreset, setStorePreset] = useState<string>(INHERIT_STORE);
  const [storeBgUrl, setStoreBgUrl] = useState('');
  const [storeOverlay, setStoreOverlay] = useState(50);
  const [saving, setSaving] = useState(false);

  const [fitOpen, setFitOpen] = useState(false);
  const [fitSrc, setFitSrc] = useState<string | null>(null);
  const [fitTarget, setFitTarget] = useState<'menu' | 'store' | null>(null);
  const [fitFileName, setFitFileName] = useState('');

  function openListingImageFit(target: 'menu' | 'store', file: File) {
    setFitSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFitTarget(target);
    setFitFileName(file.name);
    setFitOpen(true);
  }

  function onListingFitOpenChange(open: boolean) {
    setFitOpen(open);
    if (!open) {
      setFitSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setFitTarget(null);
      setFitFileName('');
    }
  }

  useEffect(() => {
    if (!vendor) return;
    setPreset(normalizeSkuCardPreset(vendor.sku_card_preset));
    setBgUrl(String(vendor.sku_card_background_url ?? '').trim());
    setOverlay(clampSkuCardOverlay(vendor.sku_card_overlay_opacity));
    const sp = vendor.store_listing_card_preset;
    if (sp != null && String(sp).trim() !== '') {
      setStorePreset(normalizeSkuCardPreset(sp));
      setStoreBgUrl(String(vendor.store_listing_card_background_url ?? '').trim());
      setStoreOverlay(clampSkuCardOverlay(vendor.store_listing_card_overlay_opacity));
    } else {
      setStorePreset(INHERIT_STORE);
      setStoreBgUrl('');
      setStoreOverlay(50);
    }
  }, [vendor]);

  const resolvedPreview = useMemo(
    () =>
      resolveSkuCardTheme({
        preset,
        backgroundUrl: bgUrl || null,
        overlayOpacity: overlay,
      }),
    [preset, bgUrl, overlay]
  );

  const resolvedStorePreview = useMemo(() => {
    if (storePreset === INHERIT_STORE) {
      return resolveSkuCardTheme({
        preset,
        backgroundUrl: bgUrl || null,
        overlayOpacity: overlay,
      });
    }
    return resolveStoreListingCardTheme({
      sku_card_preset: preset,
      sku_card_background_url: bgUrl || null,
      sku_card_overlay_opacity: overlay,
      store_listing_card_preset: normalizeSkuCardPreset(storePreset),
      store_listing_card_background_url: storeBgUrl || null,
      store_listing_card_overlay_opacity: storeOverlay,
    });
  }, [storePreset, storeBgUrl, storeOverlay, preset, bgUrl, overlay]);

  async function uploadBg(file: File) {
    if (!user?.id) return;
    const res = await uploadVendorMediaFile(user.id, file);
    if ('error' in res) {
      toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
      return;
    }
    setBgUrl(res.url);
    toast({ title: 'Image uploaded', description: 'Save to apply on your public listing menu.' });
  }

  async function uploadStoreBg(file: File) {
    if (!user?.id) return;
    const res = await uploadVendorMediaFile(user.id, file);
    if ('error' in res) {
      toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
      return;
    }
    setStoreBgUrl(res.url);
    toast({ title: 'Store image uploaded', description: 'Save to apply on Discover and Smokers Club tiles.' });
  }

  async function handleSave() {
    if (!vendor?.id) return;
    setSaving(true);
    try {
      const cleanUrl = bgUrl.trim() || null;
      const op = clampSkuCardOverlay(overlay);
      const p = normalizeSkuCardPreset(preset);
      const storeClean = storeBgUrl.trim() || null;
      const storeOp = clampSkuCardOverlay(storeOverlay);
      const sp =
        storePreset === INHERIT_STORE ? null : normalizeSkuCardPreset(storePreset);
      const { error } = await supabase
        .from('vendors')
        .update({
          sku_card_preset: p,
          sku_card_background_url: p === 'custom' ? cleanUrl : null,
          sku_card_overlay_opacity: p === 'custom' ? op : 50,
          store_listing_card_preset: sp,
          store_listing_card_background_url: sp === 'custom' ? storeClean : null,
          store_listing_card_overlay_opacity: sp === 'custom' ? storeOp : null,
        })
        .eq('id', vendor.id);
      if (error) throw error;
      toast({
        title: 'Listing design saved',
        description:
          'Menu SKUs, your store tiles on Discover, strain pages, and Smokers Club use these styles.',
      });
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="border-green-900/30 bg-gray-900 p-6 text-white">
          Sign in with a linked dispensary account to customize listing cards.
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Listing design is available when{' '}
          <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code> is enabled.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <VendorNav />
          <Card className="mx-auto mt-8 max-w-lg border-green-900/30 bg-gray-900 p-8 text-center">
            <p className="text-gray-300">No dispensary linked to your account.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorImageFitDialog
        open={fitOpen}
        onOpenChange={onListingFitOpenChange}
        imageSrc={fitSrc}
        aspect={fitTarget === 'store' ? 16 / 9 : 3 / 4}
        title={fitTarget === 'store' ? 'Position store tile image' : 'Position menu card image'}
        description={
          fitTarget === 'store'
            ? 'Wide frame for Discover / Smokers Club shop tiles. Drag and zoom for the best crop.'
            : 'Taller frame for product cards on your public menu. Drag and zoom for the best crop.'
        }
        maxOutputLongEdge={2400}
        outputBaseName={fitFileName}
        onApply={async (file) => {
          if (fitTarget === 'menu') await uploadBg(file);
          else if (fitTarget === 'store') await uploadStoreBg(file);
        }}
      />
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-green-600/20 p-3">
              <Palette className="h-7 w-7 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Listing design</h1>
              <p className="text-gray-400">
                Style menu SKUs and how your shop appears on Discover, Smokers Club, and strain vendor tiles.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>

          <div className="min-w-0 space-y-6 md:col-span-3">
            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">SKU card style</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Preset</Label>
                  <Select
                    value={preset}
                    onValueChange={(v) => setPreset(normalizeSkuCardPreset(v))}
                  >
                    <SelectTrigger className="mt-1.5 border-green-900/30 bg-gray-950 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                      {PRESET_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-sm text-gray-500">
                    {PRESET_OPTIONS.find((o) => o.value === preset)?.hint}
                  </p>
                </div>

                {preset === 'custom' && (
                  <>
                    <div>
                      <Label className="text-gray-300">Background image</Label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={bgUrl}
                          onChange={(e) => setBgUrl(e.target.value)}
                          placeholder="https://…"
                          className="border-green-900/20 bg-gray-800 text-white"
                        />
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-green-700/40 bg-green-900/30 px-3 py-2 text-sm text-green-200 hover:bg-green-900/50">
                          <Upload className="h-4 w-4" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) openListingImageFit('menu', f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        After you pick a file, drag and zoom to frame the 3×4-style menu card. We darken the image so
                        price and titles stay readable.
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-300">
                        Dark overlay: {overlay}% (higher = easier to read text)
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={85}
                        value={overlay}
                        onChange={(e) => setOverlay(clampSkuCardOverlay(Number(e.target.value)))}
                        className="mt-2 w-full accent-green-500"
                      />
                    </div>
                  </>
                )}

                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || (preset === 'custom' && !bgUrl.trim())}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save listing design'}
                </Button>
                {preset === 'custom' && !bgUrl.trim() ? (
                  <p className="text-sm text-amber-200/90">Add an image URL or upload before saving custom.</p>
                ) : null}
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <h2 className="mb-2 text-xl font-semibold text-white">Store card (Discover, Smokers Club, strain page)</h2>
              <p className="mb-4 text-sm text-gray-500">
                How your shop tile looks outside the product grid. Leave on “same as menu” to reuse the SKU style above,
                or pick a different preset or photo for store listings only.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Store preset</Label>
                  <Select
                    value={storePreset}
                    onValueChange={(v) => setStorePreset(v)}
                  >
                    <SelectTrigger className="mt-1.5 border-green-900/30 bg-gray-950 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                      <SelectItem value={INHERIT_STORE}>Same as menu SKU cards</SelectItem>
                      {PRESET_OPTIONS.map((o) => (
                        <SelectItem key={`store-${o.value}`} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {storePreset !== INHERIT_STORE && normalizeSkuCardPreset(storePreset) === 'custom' && (
                  <>
                    <div>
                      <Label className="text-gray-300">Store background image</Label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={storeBgUrl}
                          onChange={(e) => setStoreBgUrl(e.target.value)}
                          placeholder="https://… (or rely on menu custom image if same host)"
                          className="border-green-900/20 bg-gray-800 text-white"
                        />
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-green-700/40 bg-green-900/30 px-3 py-2 text-sm text-green-200 hover:bg-green-900/50">
                          <Upload className="h-4 w-4" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) openListingImageFit('store', f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Drag and zoom to frame the 16×9 store tile. If empty, your menu custom background URL is used
                        when set.
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-300">
                        Store overlay: {storeOverlay}% (only for custom store background)
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={85}
                        value={storeOverlay}
                        onChange={(e) => setStoreOverlay(clampSkuCardOverlay(Number(e.target.value)))}
                        className="mt-2 w-full accent-green-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Preview</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Menu SKU</p>
                  <div className="mx-auto max-w-sm">
                    <VendorSkuCardFrame theme={resolvedPreview} className="hover:border-green-600/35">
                      <div className="flex gap-2.5 p-2.5">
                        <div className="relative flex h-[5rem] w-[5rem] shrink-0 items-center justify-center rounded-md bg-gray-950/80 text-[10px] text-gray-500">
                          Photo
                        </div>
                        <div className="flex min-h-[5rem] min-w-0 flex-1 flex-col justify-between gap-1">
                          <div>
                            <div className="mb-0.5 flex flex-wrap items-center gap-1">
                              <ProductBrandCardChip label="Brand name" />
                              <Badge
                                variant="outline"
                                className="border-green-700/40 px-1.5 py-0 text-[9px] text-green-400/90"
                              >
                                Flower
                              </Badge>
                            </div>
                            <h4 className="line-clamp-2 text-sm font-semibold text-white">Example strain eighth</h4>
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <span className="text-base font-bold text-green-400">$42.00</span>
                            <span className="rounded-md bg-green-600 px-2.5 py-1 text-xs text-white">Add</span>
                          </div>
                        </div>
                      </div>
                    </VendorSkuCardFrame>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Store tile</p>
                  <div className="mx-auto max-w-sm">
                    <VendorSkuCardFrame theme={resolvedStorePreview} className="hover:border-green-600/35">
                      <div className="flex gap-3 p-4">
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-800 ring-1 ring-white/10" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">Your dispensary</p>
                          <p className="mt-1 text-xs text-gray-400">4.8 · 12 mi · Open now</p>
                          <p className="mt-2 text-xs text-gray-500">Delivery · City, ST</p>
                        </div>
                      </div>
                      <div className="border-t border-white/10 px-4 py-2 text-center text-xs text-green-400">
                        Website link row
                      </div>
                    </VendorSkuCardFrame>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
