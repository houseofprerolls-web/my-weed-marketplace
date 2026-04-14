'use client';

import { useCallback, useEffect, useState } from 'react';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { buildStrainDirectorySummary } from '@/lib/strainSummaries';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { StrainHeroImage } from '@/components/strains/StrainHeroImage';
import { strainRowHasCatalogPhoto } from '@/lib/strainDirectoryDisplay';

const PAGE_SIZE = 47;

type StrainRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  thc_min: number | null;
  thc_max: number | null;
  cbd_min: number | null;
  cbd_max: number | null;
  description: string | null;
  effects: string[] | null;
  flavors: string[] | null;
  terpenes: Record<string, unknown> | null;
  image_url: string | null;
  has_hero_image?: boolean | null;
  popularity_score: number | null;
  genetics: string | null;
};

function slugify(name: string): string {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseList(s: string): string[] {
  return s
    .split(/[,|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const emptyForm = () => ({
  id: '' as string,
  name: '',
  slug: '',
  type: 'hybrid',
  thc_min: '',
  thc_max: '',
  cbd_min: '0',
  cbd_max: '0',
  primary_terpene: '',
  effects_text: '',
  flavors_text: '',
  description: '',
  image_url: '',
  popularity_score: '0',
  genetics: '',
});

export function AdminStrainsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<StrainRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageJump, setPageJump] = useState('1');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, q]);

  useEffect(() => {
    setPageJump(String(page + 1));
  }, [page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('strains')
        .select('*', { count: 'exact' })
        .order('has_hero_image', { ascending: false })
        .order('name', { ascending: true });

      const term = q.trim();
      if (term) {
        const safe = term.replace(/%/g, '').replace(/,/g, '');
        query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count: c } = await query.range(from, to);
      if (error) throw error;
      setRows((data || []) as StrainRow[]);
      setCount(typeof c === 'number' ? c : 0);
    } catch (e: unknown) {
      toast({
        title: 'Load failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, q, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setIsNew(true);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (r: StrainRow) => {
    setIsNew(false);
    const terp =
      r.terpenes && typeof r.terpenes === 'object' && r.terpenes !== null && 'primary' in r.terpenes
        ? String((r.terpenes as { primary?: string }).primary || '')
        : '';
    setForm({
      id: r.id,
      name: r.name,
      slug: r.slug,
      type: r.type || 'hybrid',
      thc_min: r.thc_min != null ? String(r.thc_min) : '',
      thc_max: r.thc_max != null ? String(r.thc_max) : '',
      cbd_min: r.cbd_min != null ? String(r.cbd_min) : '0',
      cbd_max: r.cbd_max != null ? String(r.cbd_max) : '0',
      primary_terpene: terp,
      effects_text: (r.effects || []).join(', '),
      flavors_text: (r.flavors || []).join(', '),
      description: r.description || '',
      image_url: r.image_url || '',
      popularity_score: r.popularity_score != null ? String(r.popularity_score) : '0',
      genetics: r.genetics || '',
    });
    setDialogOpen(true);
  };

  const applyTemplateToForm = () => {
    const terpenes = form.primary_terpene.trim()
      ? { primary: form.primary_terpene.trim() }
      : {};
    const desc = buildStrainDirectorySummary({
      name: form.name,
      slug: form.slug || slugify(form.name),
      type: form.type,
      thc_min: form.thc_min ? Number(form.thc_min) : null,
      thc_max: form.thc_max ? Number(form.thc_max) : null,
      effects: parseList(form.effects_text),
      flavors: parseList(form.flavors_text),
      terpenes,
    });
    setForm((f) => ({ ...f, description: desc }));
    toast({ title: 'Summary rebuilt', description: 'Review and save when ready.' });
  };

  const save = async () => {
    const name = form.name.trim();
    let slug = form.slug.trim() || slugify(name);
    if (!name || !slug) {
      toast({ title: 'Name and slug required', variant: 'destructive' });
      return;
    }
    const terpenes = form.primary_terpene.trim()
      ? { primary: form.primary_terpene.trim() }
      : {};
    const payload = {
      name,
      slug,
      type: form.type as 'indica' | 'sativa' | 'hybrid',
      thc_min: form.thc_min ? Number(form.thc_min) : 0,
      thc_max: form.thc_max ? Number(form.thc_max) : 0,
      cbd_min: form.cbd_min ? Number(form.cbd_min) : 0,
      cbd_max: form.cbd_max ? Number(form.cbd_max) : 0,
      terpenes,
      effects: parseList(form.effects_text),
      flavors: parseList(form.flavors_text),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      popularity_score: form.popularity_score ? parseInt(form.popularity_score, 10) || 0 : 0,
      genetics: form.genetics.trim() || null,
      cannabis_guide_colors: {},
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase.from('strains').insert(payload);
        if (error) throw error;
        await logAdminAuditEvent(supabase, {
          actionKey: 'strain.create',
          summary: `Created strain ${name} (${slug})`,
          resourceType: 'strain',
          resourceId: slug,
          metadata: { name, slug },
        });
        toast({ title: 'Strain created' });
      } else {
        const { error } = await supabase.from('strains').update(payload).eq('id', form.id);
        if (error) throw error;
        await logAdminAuditEvent(supabase, {
          actionKey: 'strain.update',
          summary: `Updated strain ${form.id}`,
          resourceType: 'strain',
          resourceId: form.id,
          metadata: { name, slug },
        });
        toast({ title: 'Strain updated' });
      }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this strain? Products linking to it may lose the link.')) return;
    try {
      const { error } = await supabase.from('strains').delete().eq('id', id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'strain.delete',
        summary: `Deleted strain ${id}`,
        resourceType: 'strain',
        resourceId: id,
      });
      toast({ title: 'Strain deleted' });
      await load();
    } catch (e: unknown) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const rebuildAllSummaries = async () => {
    if (
      !window.confirm(
        'Rebuild directory summaries for ALL strains from type, THC, effects, and terpene data? This overwrites descriptions.'
      )
    ) {
      return;
    }
    setRebuilding(true);
    let updated = 0;
    try {
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('strains')
          .select(
            'id,name,slug,type,thc_min,thc_max,effects,flavors,terpenes,description'
          )
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        const batch = (data || []) as StrainRow[];
        if (!batch.length) break;

        const chunk = 20;
        for (let i = 0; i < batch.length; i += chunk) {
          const slice = batch.slice(i, i + chunk);
          const outs = await Promise.all(
            slice.map((row) => {
              const description = buildStrainDirectorySummary({
                name: row.name,
                slug: row.slug,
                type: row.type,
                thc_min: row.thc_min,
                thc_max: row.thc_max,
                effects: row.effects,
                flavors: row.flavors,
                terpenes: row.terpenes,
              });
              return supabase
                .from('strains')
                .update({
                  description,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', row.id);
            })
          );
          for (const o of outs) {
            if (o.error) throw o.error;
          }
          updated += slice.length;
        }
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'strain.bulk_rebuild_summaries',
        summary: `Rebuilt directory summaries for ${updated} strains`,
        resourceType: 'strains',
        resourceId: 'bulk',
        metadata: { count: updated },
      });
      toast({ title: 'Summaries rebuilt', description: `${updated} strains updated.` });
      await load();
    } catch (e: unknown) {
      toast({
        title: 'Bulk rebuild failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRebuilding(false);
    }
  };

  const onImageFile = async (file: File | null) => {
    if (!file || !user?.id) {
      if (!user?.id) toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const up = await uploadVendorMediaFile(user.id, file);
      if ('error' in up) throw new Error(up.error);
      setForm((f) => ({ ...f, image_url: up.url }));
      toast({ title: 'Image uploaded' });
    } catch (e: unknown) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const commitPageJump = useCallback(() => {
    const raw = pageJump.trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      setPageJump(String(page + 1));
      return;
    }
    const clamped = Math.min(totalPages, Math.max(1, n));
    setPageJump(String(clamped));
    if (clamped - 1 !== page) {
      setPage(clamped - 1);
    }
  }, [pageJump, page, totalPages]);

  return (
    <div className="space-y-6">
      <Card className="border-green-900/30 bg-gray-950/80 p-4 text-sm text-gray-300">
        Add or edit strains, photos, and descriptions. Use <strong className="text-white">Rebuild summaries</strong> to
        refresh every description from structured fields (original templates, not third-party copy).
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label className="text-gray-400">Search name or slug</Label>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Blue Dream…"
            className="mt-1 border-green-900/40 bg-gray-950 text-white"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-amber-600/50 text-amber-200"
          disabled={rebuilding}
          onClick={() => void rebuildAllSummaries()}
        >
          {rebuilding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Rebuild all summaries
        </Button>
        <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add strain
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-green-500" />
        </div>
      ) : (
        <Card className="overflow-hidden border-green-900/30 bg-gray-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-green-900/30 bg-black/40 text-gray-400">
                <tr>
                  <th className="p-3">Photo</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-green-900/20 hover:bg-white/5">
                    <td className="p-2">
                      <div className="relative h-12 w-16 overflow-hidden rounded bg-gray-900">
                        <StrainHeroImage
                          slug={r.slug}
                          imageUrl={r.image_url}
                          alt=""
                          maxCandidates={6}
                          className="absolute inset-0 h-full w-full"
                          imgClassName="h-full w-full object-cover"
                          cornerBrandMark={strainRowHasCatalogPhoto(r)}
                          cornerBrandSize="sm"
                        />
                      </div>
                    </td>
                    <td className="p-3 font-medium text-white">{r.name}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize border-green-700/40 text-green-300">
                        {r.type}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-500">{r.slug}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:bg-red-950/40"
                          onClick={() => void remove(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-green-900/30 p-3 text-sm text-gray-400">
            <span className="whitespace-nowrap">{count} strains</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <label className="flex items-center gap-2 text-gray-400">
                <span className="whitespace-nowrap">Page</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={totalPages}
                  value={pageJump}
                  onChange={(e) => setPageJump(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitPageJump();
                    }
                  }}
                  onBlur={() => {
                    const n = parseInt(pageJump.trim(), 10);
                    if (!Number.isFinite(n) || n < 1 || n > totalPages) {
                      setPageJump(String(page + 1));
                    }
                  }}
                  disabled={loading}
                  className="h-8 w-16 border-green-900/40 bg-background px-2 text-center text-sm text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Page number"
                />
                <span className="whitespace-nowrap">/ {totalPages}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  disabled={loading}
                  onClick={() => commitPageJump()}
                >
                  Go
                </Button>
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-green-900/40 bg-gray-950 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add strain' : 'Edit strain'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 border-green-900/40 bg-background text-foreground"
                onBlur={() => {
                  if (isNew && !form.slug.trim()) setForm((f) => ({ ...f, slug: slugify(f.name) }));
                }}
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="mt-1 border-green-900/40 bg-background font-mono text-sm text-white"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1 border-green-900/40 bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indica">Indica</SelectItem>
                  <SelectItem value="sativa">Sativa</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>THC min %</Label>
                <Input
                  value={form.thc_min}
                  onChange={(e) => setForm((f) => ({ ...f, thc_min: e.target.value }))}
                  className="mt-1 border-green-900/40 bg-background text-foreground"
                />
              </div>
              <div>
                <Label>THC max %</Label>
                <Input
                  value={form.thc_max}
                  onChange={(e) => setForm((f) => ({ ...f, thc_max: e.target.value }))}
                  className="mt-1 border-green-900/40 bg-background text-foreground"
                />
              </div>
            </div>
            <div>
              <Label>Primary terpene (label)</Label>
              <Input
                value={form.primary_terpene}
                onChange={(e) => setForm((f) => ({ ...f, primary_terpene: e.target.value }))}
                placeholder="Limonene"
                className="mt-1 border-green-900/40 bg-background text-foreground"
              />
            </div>
            <div>
              <Label>Effects (comma-separated, strongest first)</Label>
              <Input
                value={form.effects_text}
                onChange={(e) => setForm((f) => ({ ...f, effects_text: e.target.value }))}
                placeholder="Relaxed, Happy, Euphoric"
                className="mt-1 border-green-900/40 bg-background text-foreground"
              />
            </div>
            <div>
              <Label>Flavors (comma-separated)</Label>
              <Input
                value={form.flavors_text}
                onChange={(e) => setForm((f) => ({ ...f, flavors_text: e.target.value }))}
                className="mt-1 border-green-900/40 bg-background text-foreground"
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                className="mt-1 border-green-900/40 bg-background text-foreground"
              />
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  className="text-xs text-gray-400 file:mr-2 file:text-green-400"
                  onChange={(e) => void onImageFile(e.target.files?.[0] ?? null)}
                />
                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-green-400" /> : <Upload className="h-4 w-4 text-gray-500" />}
              </div>
            </div>
            <div>
              <Label>Popularity score (sort on /strains)</Label>
              <Input
                value={form.popularity_score}
                onChange={(e) => setForm((f) => ({ ...f, popularity_score: e.target.value }))}
                className="mt-1 border-green-900/40 bg-background text-foreground"
              />
            </div>
            <div>
              <Label>Genetics (optional)</Label>
              <Input
                value={form.genetics}
                onChange={(e) => setForm((f) => ({ ...f, genetics: e.target.value }))}
                className="mt-1 border-green-900/40 bg-background text-foreground"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Label>Description</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={applyTemplateToForm}>
                  Rebuild from fields
                </Button>
              </div>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={6}
                className="border-green-900/40 bg-background text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} className="bg-green-600 hover:bg-green-700" onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
