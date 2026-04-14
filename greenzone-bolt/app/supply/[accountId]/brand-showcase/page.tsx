'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { BRAND_PAGE_THEME_IDS, isBrandPageThemeId } from '@/lib/brandShowcaseThemes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Loader2 } from 'lucide-react';
import { BrandShowcaseImageUpload } from '@/components/brand/BrandShowcaseImageUpload';

type BrandEdit = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  about: string | null;
  website_url: string | null;
  social_instagram: string | null;
  hero_image_url: string | null;
  page_theme: string | null;
};

export default function SupplyBrandShowcasePage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const { toast } = useToast();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pageTheme, setPageTheme] = useState('emerald');

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data: acc, error: aErr } = await supabase.from('supply_accounts').select('brand_id').eq('id', accountId).maybeSingle();
    if (aErr || !acc) {
      setBrandId(null);
      setBrand(null);
      setLoading(false);
      return;
    }
    const bid = (acc as { brand_id: string | null }).brand_id;
    setBrandId(bid);
    if (!bid) {
      setBrand(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('brands')
      .select('id,name,slug,logo_url,tagline,about,website_url,social_instagram,hero_image_url,page_theme')
      .eq('id', bid)
      .maybeSingle();
    if (error || !data) {
      setBrand(null);
      if (error) toast({ title: 'Could not load brand', description: error.message, variant: 'destructive' });
    } else {
      const b = data as BrandEdit;
      setBrand(b);
      setTagline(b.tagline ?? '');
      setAbout(b.about ?? '');
      setWebsiteUrl(b.website_url ?? '');
      setSocialInstagram(b.social_instagram ?? '');
      setHeroImageUrl(b.hero_image_url ?? '');
      setLogoUrl(b.logo_url ?? '');
      setPageTheme(isBrandPageThemeId(String(b.page_theme || '')) ? b.page_theme! : 'emerald');
    }
    setLoading(false);
  }, [accountId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!brandId) return;
    setSaving(true);
    try {
      const p_patch = {
        tagline: tagline.trim(),
        about: about.trim(),
        website_url: websiteUrl.trim(),
        social_instagram: socialInstagram.trim(),
        hero_image_url: heroImageUrl.trim(),
        logo_url: logoUrl.trim(),
        page_theme: pageTheme,
      };
      const { error } = await supabase.rpc('brand_manager_update_showcase', {
        p_brand_id: brandId,
        p_patch,
      });
      if (error) throw error;
      toast({ title: 'Brand card updated' });
      void load();
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!accountId) return null;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!brandId) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/80 p-8 text-zinc-400">
        This supply account is not linked to a brand, so there is no public brand directory card to edit here.
      </Card>
    );
  }

  if (!brand) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/80 p-8 text-zinc-400">
        Could not load brand data. If you were recently added, try again in a moment.
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Brand on site</h1>
        <p className="mt-1 text-sm text-zinc-500">
          These fields control your card on the public{' '}
          <Link href="/brands" className="text-green-400 underline-offset-2 hover:underline">
            /brands
          </Link>{' '}
          directory and your brand page hero, logo, and tagline. Name, slug, and verification are still set by GreenZone admin.
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/80 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-white">{brand.name}</h2>
            <p className="text-xs text-zinc-500">
              Public URL:{' '}
              <Link
                href={`/brands/${encodeURIComponent(brand.slug)}`}
                className="text-violet-400 underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                /brands/{brand.slug}
              </Link>
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-zinc-600" asChild>
            <Link href={`/brands/${encodeURIComponent(brand.slug)}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              Preview
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          <BrandShowcaseImageUpload
            brandId={brand.id}
            kind="logo"
            label="Logo (directory tile)"
            url={logoUrl}
            onUrlChange={setLogoUrl}
            showUrlFallback={false}
          />
          <div>
            <Label>Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
          </div>
          <div>
            <Label>About</Label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Website URL</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
            </div>
          </div>
          <BrandShowcaseImageUpload
            brandId={brand.id}
            kind="hero"
            label="Hero image (card background)"
            url={heroImageUrl}
            onUrlChange={setHeroImageUrl}
            showUrlFallback={false}
          />
          <div>
            <Label>Page theme</Label>
            <Select value={pageTheme} onValueChange={setPageTheme}>
              <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-950 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRAND_PAGE_THEME_IDS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void save()} disabled={saving} className="bg-green-700 hover:bg-green-600">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
