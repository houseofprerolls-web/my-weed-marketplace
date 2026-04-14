'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

type Kind = 'logo' | 'hero';

const ACCEPT = 'image/png,image/jpeg,image/webp';

type Props = {
  brandId: string;
  kind: Kind;
  label: string;
  /** Current image URL (storage or external) */
  url: string;
  onUrlChange: (next: string) => void;
  /** Optional manual URL field (shown below upload) */
  showUrlFallback?: boolean;
  className?: string;
};

export function BrandShowcaseImageUpload({
  brandId,
  kind,
  label,
  url,
  onUrlChange,
  showUrlFallback = true,
  className,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPickFile(file: File | null) {
    if (!file || !brandId) return;
    const mime = file.type.toLowerCase();
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
      toast({
        title: 'Unsupported file',
        description: 'Use PNG, JPEG, or WebP.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setUploading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: 'Sign in required', variant: 'destructive' });
        return;
      }
      const signRes = await fetch('/api/brand-showcase/image-upload-sign', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          kind,
          mime_type: mime,
          bytes: file.size,
        }),
      });
      const signJ = (await signRes.json().catch(() => ({}))) as {
        error?: string;
        signed_url?: string;
        public_url?: string;
      };
      if (!signRes.ok || !signJ.signed_url || !signJ.public_url) {
        toast({
          title: 'Upload not allowed',
          description: signJ.error || signRes.statusText,
          variant: 'destructive',
        });
        return;
      }
      const put = await fetch(signJ.signed_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': mime },
      });
      if (!put.ok) {
        toast({ title: 'Upload failed', description: put.statusText, variant: 'destructive' });
        return;
      }
      onUrlChange(signJ.public_url);
      toast({ title: 'Image uploaded', description: 'Save your changes to apply on the brand page.' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        {url.trim() ? (
          <div
            className={cn(
              'relative shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950',
              kind === 'hero' ? 'h-24 w-40' : 'h-16 w-16'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={uploading || !brandId}
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || !brandId}
            className="w-fit border-zinc-600"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload PNG, JPEG, or WebP
          </Button>
          <p className="text-xs text-zinc-500">Up to 8MB. Replaces any previous {kind} file for this brand in storage.</p>
        </div>
      </div>
      {showUrlFallback ? (
        <div>
          <Label className="text-xs font-normal text-zinc-500">Or paste image URL</Label>
          <Input
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://…"
            className="mt-1 border-zinc-700 bg-zinc-950"
          />
        </div>
      ) : null}
    </div>
  );
}
