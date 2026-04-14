'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { BRAND_PAGE_THEME_IDS, isBrandPageThemeId } from '@/lib/brandShowcaseThemes';
import { useBrandPortalAccess } from '@/hooks/useBrandPortalAccess';
import { useRole } from '@/hooks/useRole';
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

export default function BrandPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const { canAccessAdminDashboard } = useRole();
  const { toast } = useToast();
  const { assignments, loading: loadingList, mayAccess } = useBrandPortalAccess(user?.id, {
    treatAsAdmin: canAccessAdminDashboard,
  });
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandEdit | null>(null);
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogProductCount, setCatalogProductCount] = useState<number | null>(null);

  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pageTheme, setPageTheme] = useState('emerald');

  useEffect(() => {
    if (assignments.length === 0) {
      setSelectedBrandId(null);
      return;
    }
    setSelectedBrandId((prev) => {
      if (prev && assignments.some((a) => a.brand_id === prev)) return prev;
      return assignments[0]!.brand_id;
    });
  }, [assignments]);

  useEffect(() => {
    if (!selectedBrandId) {
      setBrand(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadingBrand(true);
      const { data, error } = await supabase
        .from('brands')
        .select(
          'id,name,slug,logo_url,tagline,about,website_url,social_instagram,hero_image_url,page_theme'
        )
        .eq('id', selectedBrandId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setBrand(null);
        toast({ title: 'Could not load brand', description: error?.message, variant: 'destructive' });
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
      setLoadingBrand(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBrandId, toast]);

  const save = async () => {
    if (!selectedBrandId) return;
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
        p_brand_id: selectedBrandId,
        p_patch,
      });
      if (error) throw error;
      toast({ title: 'Showcase updated' });
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingList) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card className="border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h1 className="text-lg font-semibold text-white">Sign in required</h1>
          <p className="mt-2 text-sm text-zinc-400">Use the header to sign in. Brand managers are assigned by GreenZone admin.</p>
          <Button className="mt-6" asChild>
            <Link href="/discover">Back to Discover</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!mayAccess) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card className="border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h1 className="text-lg font-semibold text-white">No brand access</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your account is not linked to a brand page yet. Contact GreenZone support or your admin to be added as a page
            editor.
          </p>
          <Button variant="outline" className="mt-6 border-zinc-600" asChild>
            <Link href="/discover">Home</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (assignments.length === 0 && canAccessAdminDashboard) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card className="border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h1 className="text-lg font-semibold text-white">No brands yet</h1>
          <p className="mt-2 text-sm text-zinc-400">
            There are no brand records to edit. Add brands in Admin → Brand pages or the catalog tools.
          </p>
          <Button variant="outline" className="mt-6 border-zinc-600" asChild>
            <Link href="/admin/brand-pages">Open brand pages (admin)</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Brand dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {canAccessAdminDashboard
              ? "Edit any brand's public showcase. Name, slug, and verification are still controlled from Admin → Brand pages."
              : 'Update how your brand appears on the public page. Name, slug, and verification are set by GreenZone admin.'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="border-zinc-700" asChild>
          <Link href="/discover">← Discover</Link>
        </Button>
      </div>

      {assignments.length > 1 ? (
        <Card className="mb-6 border-zinc-800 bg-zinc-900/50 p-4">
          <Label className="text-zinc-400">Brand</Label>
          <Select value={selectedBrandId ?? ''} onValueChange={(v) => setSelectedBrandId(v || null)}>
            <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-950">
              <SelectValue placeholder="Choose brand…" />
            </SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.brand_id} value={a.brand_id}>
                  {a.brand_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      ) : null}

      {loadingBrand ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : !brand ? (
        <p className="text-zinc-500">Could not load brand.</p>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/50 p-6">
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
                Preview public page
              </Link>
            </Button>
          </div>

          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-400">
            {catalogProductCount === null ? (
              <span className="text-zinc-500">Loading catalog stats…</span>
            ) : (
              <>
                <span className="font-medium text-zinc-300">{catalogProductCount}</span> master-catalog{' '}
                {catalogProductCount === 1 ? 'product' : 'products'} linked to this brand
                {catalogProductCount === 0 ? (
                  <span className="block pt-1 text-xs text-zinc-600">
                    GreenZone adds catalog items; your story and visuals below still appear on the brand page.
                  </span>
                ) : null}
              </>
            )}
          </div>

          <div className="space-y-4">
            <BrandShowcaseImageUpload
              brandId={brand.id}
              kind="logo"
              label="Logo"
              url={logoUrl}
              onUrlChange={setLogoUrl}
              showUrlFallback={false}
            />
            <div>
              <Label>Tagline</Label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950" />
            </div>
            <div>
              <Label>About — public brand description</Label>
              <p className="mb-1 text-xs text-zinc-500">
                Shown on your brand page under “About”. Use line breaks for paragraphs.
              </p>
              <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className="mt-1 border-zinc-700 bg-zinc-950" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Website URL</Label>
                <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950" />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input
                  value={socialInstagram}
                  onChange={(e) => setSocialInstagram(e.target.value)}
                  className="mt-1 border-zinc-700 bg-zinc-950"
                />
              </div>
            </div>
            <BrandShowcaseImageUpload
              brandId={brand.id}
              kind="hero"
              label="Hero image"
              url={heroImageUrl}
              onUrlChange={setHeroImageUrl}
              showUrlFallback={false}
            />
            <div>
              <Label>Page theme</Label>
              <Select value={pageTheme} onValueChange={setPageTheme}>
                <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-950">
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
            <Button onClick={() => void save()} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
