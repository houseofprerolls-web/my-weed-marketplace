'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { BRAND_PAGE_THEME_IDS, isBrandPageThemeId } from '@/lib/brandShowcaseThemes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { BrandShowcaseImageUpload } from '@/components/brand/BrandShowcaseImageUpload';

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
  logo_url: string | null;
  tagline: string | null;
  about: string | null;
  website_url: string | null;
  social_instagram: string | null;
  hero_image_url: string | null;
  page_theme: string | null;
  created_at: string;
  updated_at?: string | null;
};

type ManagerRow = {
  id: string;
  user_id: string;
  created_at: string;
  email?: string | null;
  full_name?: string | null;
};

const BRAND_SELECT =
  'id,name,slug,verified,logo_url,tagline,about,website_url,social_instagram,hero_image_url,page_theme,created_at,updated_at';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AdminBrandPagesPanel() {
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [verified, setVerified] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [pageTheme, setPageTheme] = useState<string>('emerald');

  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [addIdentifier, setAddIdentifier] = useState('');
  const [addingManager, setAddingManager] = useState(false);
  const [removingManagerId, setRemovingManagerId] = useState<string | null>(null);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('brands').select(BRAND_SELECT).order('name');
    if (error) {
      const msg = error.message || '';
      if (/tagline|about|page_theme|column/i.test(msg)) {
        const { data: d2, error: e2 } = await supabase
          .from('brands')
          .select('id,name,slug,verified,logo_url,created_at,updated_at')
          .order('name');
        if (e2) {
          toast({ title: 'Could not load brands', description: e2.message, variant: 'destructive' });
          setBrands([]);
        } else {
          setBrands((d2 || []) as BrandRow[]);
          toast({
            title: 'Limited brand columns',
            description: 'Apply migration 0177+0178 for full showcase fields.',
            variant: 'destructive',
          });
        }
      } else {
        toast({ title: 'Could not load brands', description: error.message, variant: 'destructive' });
        setBrands([]);
      }
    } else {
      setBrands((data || []) as BrandRow[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  const loadManagers = useCallback(
    async (brandId: string) => {
      setLoadingManagers(true);
      const { data: rows, error } = await supabase
        .from('brand_page_managers')
        .select('id,user_id,created_at')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: true });
      if (error) {
        if (/brand_page_managers|does not exist/i.test(error.message)) {
          setManagers([]);
        } else {
          toast({ title: 'Could not load managers', description: error.message, variant: 'destructive' });
          setManagers([]);
        }
        setLoadingManagers(false);
        return;
      }
      const ids = Array.from(new Set((rows || []).map((r) => r.user_id)));
      let profileMap = new Map<string, { email: string | null; full_name: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id,email,full_name').in('id', ids);
        profileMap = new Map(
          (profs || []).map((p) => [
            p.id,
            { email: (p as { email?: string | null }).email ?? null, full_name: (p as { full_name?: string | null }).full_name ?? null },
          ])
        );
      }
      setManagers(
        (rows || []).map((r) => {
          const p = profileMap.get(r.user_id);
          return {
            id: r.id,
            user_id: r.user_id,
            created_at: r.created_at,
            email: p?.email,
            full_name: p?.full_name,
          };
        })
      );
      setLoadingManagers(false);
    },
    [toast]
  );

  const applyBrandToForm = useCallback(
    (b: BrandRow) => {
      setName(b.name);
      setSlug(b.slug);
      setVerified(b.verified);
      setLogoUrl(b.logo_url ?? '');
      setTagline(b.tagline ?? '');
      setAbout(b.about ?? '');
      setWebsiteUrl(b.website_url ?? '');
      setSocialInstagram(b.social_instagram ?? '');
      setHeroImageUrl(b.hero_image_url ?? '');
      setPageTheme(isBrandPageThemeId(String(b.page_theme || '')) ? b.page_theme! : 'emerald');
    },
    []
  );

  useEffect(() => {
    if (!selectedId) {
      setManagers([]);
      return;
    }
    const b = brands.find((x) => x.id === selectedId);
    if (b) applyBrandToForm(b);
    void loadManagers(selectedId);
  }, [selectedId, brands, applyBrandToForm, loadManagers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }, [brands, query]);

  const selectedBrand = selectedId ? brands.find((b) => b.id === selectedId) : null;

  const saveBrand = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          name: name.trim(),
          slug: slug.trim(),
          verified,
          logo_url: logoUrl.trim() || null,
          tagline: tagline.trim() || null,
          about: about.trim() || null,
          website_url: websiteUrl.trim() || null,
          social_instagram: socialInstagram.trim() || null,
          hero_image_url: heroImageUrl.trim() || null,
          page_theme: pageTheme,
        })
        .eq('id', selectedId);
      if (error) throw error;

      await logAdminAuditEvent(supabase, {
        actionKey: 'brand.page.admin_update',
        summary: `Updated brand ${name.trim()} (${selectedId})`,
        resourceType: 'brand',
        resourceId: selectedId,
        metadata: { slug: slug.trim(), verified },
      });

      toast({ title: 'Brand saved' });
      await loadBrands();
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addManager = async () => {
    if (!selectedId) return;
    const raw = addIdentifier.trim();
    if (!raw) {
      toast({ title: 'Enter email or user UUID', variant: 'destructive' });
      return;
    }
    setAddingManager(true);
    try {
      let userId: string | null = null;
      if (UUID_RE.test(raw)) {
        userId = raw;
        const { data: p, error: pe } = await supabase.from('profiles').select('id').eq('id', raw).maybeSingle();
        if (pe || !p) throw new Error('No profile for that UUID');
      } else {
        const email = raw.toLowerCase();
        const { data: matches, error: me } = await supabase
          .from('profiles')
          .select('id,email')
          .ilike('email', email);
        if (me) throw me;
        const exact = (matches || []).find((m) => (m.email || '').toLowerCase() === email);
        if (exact) userId = exact.id;
        else if ((matches || []).length === 1) userId = matches![0]!.id;
        else if ((matches || []).length > 1) {
          throw new Error('Multiple profiles match — use full email or paste user UUID');
        } else {
          throw new Error('No profile found for that email');
        }
      }

      const { error } = await supabase.from('brand_page_managers').insert({ brand_id: selectedId, user_id: userId });
      if (error) throw error;

      await logAdminAuditEvent(supabase, {
        actionKey: 'brand.page.manager_add',
        summary: `Added brand page manager for brand ${selectedId}`,
        resourceType: 'brand',
        resourceId: selectedId,
        metadata: { user_id: userId },
      });

      toast({ title: 'Manager added' });
      setAddIdentifier('');
      await loadManagers(selectedId);
    } catch (e: unknown) {
      toast({
        title: 'Could not add manager',
        description: e instanceof Error ? e.message : formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setAddingManager(false);
    }
  };

  const removeManager = async (row: ManagerRow) => {
    if (!selectedId) return;
    if (!window.confirm('Remove this user’s access to edit this brand page?')) return;
    setRemovingManagerId(row.id);
    try {
      const { error } = await supabase.from('brand_page_managers').delete().eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'brand.page.manager_remove',
        summary: `Removed brand page manager ${row.user_id}`,
        resourceType: 'brand',
        resourceId: selectedId,
        metadata: { manager_row_id: row.id, user_id: row.user_id },
      });
      toast({ title: 'Manager removed' });
      await loadManagers(selectedId);
    } catch (e: unknown) {
      toast({ title: 'Remove failed', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setRemovingManagerId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <Label className="text-zinc-400">Search brands</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or slug…"
          className="mt-1 border-zinc-700 bg-zinc-950 text-white"
        />
        <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {filtered.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedId === b.id
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-white'
                    : 'border-transparent bg-zinc-950/60 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-zinc-500">{b.slug}</span>
                {b.verified ? (
                  <Badge className="mt-1 w-fit bg-emerald-900/50 text-emerald-200">Verified</Badge>
                ) : (
                  <Badge variant="outline" className="mt-1 w-fit border-zinc-600 text-zinc-400">
                    Unverified
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="min-w-0 space-y-6">
        {!selectedBrand ? (
          <Card className="border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
            Select a brand to edit showcase fields and managers.
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">{selectedBrand.name}</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="border-zinc-600" asChild>
                  <Link href={`/brands/${encodeURIComponent(selectedBrand.slug)}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Public page
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Identity &amp; status</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950" />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch id="verified" checked={verified} onCheckedChange={setVerified} />
                  <Label htmlFor="verified">Verified (visible to shoppers on /brands)</Label>
                </div>
              </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Showcase</h3>
              <div className="grid gap-4">
                <BrandShowcaseImageUpload
                  brandId={selectedId!}
                  kind="logo"
                  label="Logo"
                  url={logoUrl}
                  onUrlChange={setLogoUrl}
                  showUrlFallback
                />
                <div>
                  <Label>Tagline</Label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950" />
                </div>
                <div>
                  <Label>About (plain text)</Label>
                  <Textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={6}
                    className="mt-1 border-zinc-700 bg-zinc-950"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Website URL</Label>
                    <Input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="mt-1 border-zinc-700 bg-zinc-950"
                    />
                  </div>
                  <div>
                    <Label>Instagram (@handle or URL)</Label>
                    <Input
                      value={socialInstagram}
                      onChange={(e) => setSocialInstagram(e.target.value)}
                      className="mt-1 border-zinc-700 bg-zinc-950"
                    />
                  </div>
                </div>
                <BrandShowcaseImageUpload
                  brandId={selectedId!}
                  kind="hero"
                  label="Hero image"
                  url={heroImageUrl}
                  onUrlChange={setHeroImageUrl}
                  showUrlFallback
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
                <Button onClick={() => void saveBrand()} disabled={saving} className="w-fit bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save brand'}
                </Button>
              </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                <UserPlus className="h-4 w-4" />
                Page editors
              </h3>
              <p className="mb-4 text-xs text-zinc-500">
                Assigned users can edit showcase fields (not name/slug/verified) from the Brand dashboard. Add by exact email or
                profile UUID.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Label>Email or user UUID</Label>
                  <Input
                    value={addIdentifier}
                    onChange={(e) => setAddIdentifier(e.target.value)}
                    placeholder="user@example.com"
                    className="mt-1 border-zinc-700 bg-zinc-950"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void addManager()}
                  disabled={addingManager}
                  className="bg-zinc-100 text-zinc-900 hover:bg-white"
                >
                  {addingManager ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                  Add
                </Button>
              </div>
              {loadingManagers ? (
                <div className="mt-4 flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              ) : managers.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">No managers yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                  {managers.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate text-white">{m.email || m.user_id}</div>
                        {m.full_name ? <div className="text-xs text-zinc-500">{m.full_name}</div> : null}
                        <div className="font-mono text-[10px] text-zinc-600">{m.user_id}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                        disabled={removingManagerId === m.id}
                        onClick={() => void removeManager(m)}
                      >
                        {removingManagerId === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
