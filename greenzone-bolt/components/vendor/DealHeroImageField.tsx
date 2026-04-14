'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';

type Props = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

/**
 * Deal promo image: stored on `deals.image_url` (and mirrored in `deal_options.hero_image_url` on save).
 * Used on Discover, /deals, menu deal chips, and on SKU tiles when the deal applies.
 */
export function DealHeroImageField({ value, onChange, disabled }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPickFile(file: File | undefined) {
    if (!file || !user?.id) {
      if (!user?.id) {
        toast({ title: 'Sign in required', description: 'Sign in to upload images.', variant: 'destructive' });
      }
      return;
    }
    setUploading(true);
    const res = await uploadVendorMediaFile(user.id, file);
    setUploading(false);
    if ('error' in res) {
      toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
      return;
    }
    onChange(res.url);
    toast({ title: 'Image uploaded', description: 'Save the deal to use it everywhere.' });
  }

  const v = value.trim();

  return (
    <div className="md:col-span-2 space-y-2">
      <Label className="text-gray-300">Deal photo (optional)</Label>
      <p className="text-xs text-gray-500">
        Shows on Discover and the deals page, on your menu deal chip, and on SKUs while this deal applies. You can paste a
        URL or upload (stored in your vendor media bucket).
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || uploading}
          className="mt-0 flex-1 border-green-900/30 bg-gray-950 text-white"
          placeholder="https://… or upload below"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            void onPickFile(f);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading || !user?.id}
          className="shrink-0 border-green-800/50 text-green-200 hover:bg-green-950/50"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
          <span className="ml-2">{uploading ? 'Uploading…' : 'Upload'}</span>
        </Button>
      </div>
      {v ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-green-900/30 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v} alt="" className="max-h-40 w-full object-contain object-center" />
        </div>
      ) : null}
    </div>
  );
}
