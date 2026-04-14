'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { parseImageLines } from '@/lib/mergeProductHeroImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StrainEncyclopediaPicker } from '@/components/vendor/StrainEncyclopediaPicker';
import type { EncyclopediaStrain } from '@/lib/strainProductPrefill';
import { Loader2, Trash2, RefreshCw, Package } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '@/components/vendor/VendorProductForm';

type BrandOpt = { id: string; name: string; slug: string; verified: boolean | null };

type CatalogRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  images: string[] | null;
  potency_thc: number | null;
  potency_cbd: number | null;
  strain_id: string | null;
  avg_rating: number | null;
  review_count: number | null;
};

export function AdminMasterCatalogManager() {
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('flower');
  const [description, setDescription] = useState('');
  const [imageUrlsText, setImageUrlsText] = useState('');
  const [potencyThc, setPotencyThc] = useState('');
  const [potencyCbd, setPotencyCbd] = useState('');
  const [avgRating, setAvgRating] = useState('');
  const [reviewCount, setReviewCount] = useState('');
  const [strainId, setStrainId] = useState<string | null>(null);
  const [strainLabel, setStrainLabel] = useState<string | null>(null);

  const loadBrands = useCallback(async () => {
    setLoadingBrands(true);
    const { data, error } = await supabase.from('brands').select('id,name,slug,verified').order('name');
    if (error) {
      console.error(error);
      toast({ title: 'Could not load brands', description: error.message, variant: 'destructive' });
      setBrands([]);
    } else {
      setBrands((data || []) as BrandOpt[]);
    }
    setLoadingBrands(false);
  }, [toast]);

  const loadCatalogForBrand = useCallback(
    async (bid: string) => {
      if (!bid) {
        setRows([]);
        return;
      }
      setLoadingRows(true);
      const { data, error } = await supabase
        .from('catalog_products')
        .select(
          'id,name,category,description,images,potency_thc,potency_cbd,strain_id,avg_rating,review_count'
        )
        .eq('brand_id', bid)
        .order('name')
        .limit(500);
      if (error) {
        console.error(error);
        const msg = error.message || '';
        if (/avg_rating|review_count|column/i.test(msg)) {
          const { data: d2, error: e2 } = await supabase
            .from('catalog_products')
            .select('id,name,category,description,images,potency_thc,potency_cbd,strain_id')
            .eq('brand_id', bid)
            .order('name')
            .limit(500);
          if (e2) {
            toast({ title: 'Could not load catalog', description: e2.message, variant: 'destructive' });
            setRows([]);
          } else {
            setRows((d2 || []) as CatalogRow[]);
          }
        } else {
          toast({ title: 'Could not load catalog', description: msg, variant: 'destructive' });
          setRows([]);
        }
      } else {
        setRows((data || []) as CatalogRow[]);
      }
      setLoadingRows(false);
    },
    [toast]
  );

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    if (brandId) void loadCatalogForBrand(brandId);
    else setRows([]);
  }, [brandId, loadCatalogForBrand]);

  const onPickStrain = (s: EncyclopediaStrain) => {
    setStrainId(s.id);
    setStrainLabel(s.name);
  };

  const clearStrain = () => {
    setStrainId(null);
    setStrainLabel(null);
  };

  const resetForm = () => {
    setName('');
    setCategory('flower');
    setDescription('');
    setImageUrlsText('');
    setPotencyThc('');
    setPotencyCbd('');
    setAvgRating('');
    setReviewCount('');
    clearStrain();
  };

  const verifyBrand = async () => {
    if (!brandId) return;
    const { error } = await supabase.from('brands').update({ verified: true }).eq('id', brandId);
    if (error) {
      toast({ title: 'Could not verify brand', description: error.message, variant: 'destructive' });
      return;
    }
    await logAdminAuditEvent(supabase, {
      actionKey: 'catalog.brand.verify',
      summary: `Verified brand ${brandId}`,
      resourceType: 'brand',
      resourceId: brandId,
    });
    toast({ title: 'Brand marked verified', description: 'Vendors can see this brand in the catalog picker.' });
    await loadBrands();
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) {
      toast({ title: 'Pick a brand first', variant: 'destructive' });
      return;
    }
    const n = name.trim();
    if (!n) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const images = parseImageLines(imageUrlsText);
    const thcN = potencyThc.trim() === '' ? null : Number(potencyThc);
    const cbdN = potencyCbd.trim() === '' ? null : Number(potencyCbd);
    const potency_thc =
      thcN != null && Number.isFinite(thcN) && thcN >= 0 && thcN <= 100 ? thcN : null;
    const potency_cbd =
      cbdN != null && Number.isFinite(cbdN) && cbdN >= 0 && cbdN <= 100 ? cbdN : null;
    const ar = avgRating.trim() === '' ? null : Number(avgRating);
    const avg_rating =
      ar != null && Number.isFinite(ar) && ar >= 0 && ar <= 5 ? Math.round(ar * 100) / 100 : null;
    const rc = reviewCount.trim() === '' ? null : Number.parseInt(reviewCount, 10);
    const review_count =
      rc != null && Number.isFinite(rc) && rc >= 0 ? rc : 0;

    const payload: Record<string, unknown> = {
      brand_id: brandId,
      name: n.slice(0, 500),
      category,
      description: description.trim() || null,
      images,
      potency_thc,
      potency_cbd,
      strain_id: strainId,
    };
    if (avg_rating != null) payload.avg_rating = avg_rating;
    if (reviewCount.trim() !== '') payload.review_count = review_count;

    setSaving(true);
    try {
      const { error } = await supabase.from('catalog_products').insert(payload);
      if (error) {
        if (/avg_rating|review_count|column/i.test(error.message || '')) {
          delete payload.avg_rating;
          delete payload.review_count;
          const { error: e2 } = await supabase.from('catalog_products').insert(payload);
          if (e2) throw e2;
        } else {
          throw error;
        }
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'catalog.product.create',
        summary: `Added master catalog product “${n.slice(0, 80)}”`,
        resourceType: 'catalog_product',
        resourceId: brandId,
        metadata: { brand_id: brandId, name: n.slice(0, 200) },
      });
      toast({ title: 'Added to master catalog' });
      resetForm();
      await loadCatalogForBrand(brandId);
    } catch (err: unknown) {
      toast({
        title: 'Insert failed',
        description: formatSupabaseError(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id: string) => {
    if (!window.confirm('Remove this row from the master catalog? Linked vendor SKUs keep selling but lose catalog link.')) {
      return;
    }
    setDeletingId(id);
    try {
      const { error } = await supabase.from('catalog_products').delete().eq('id', id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'catalog.product.delete',
        summary: `Removed master catalog product ${id}`,
        resourceType: 'catalog_product',
        resourceId: id,
      });
      toast({ title: 'Removed' });
      if (brandId) await loadCatalogForBrand(brandId);
    } catch (err: unknown) {
      toast({
        title: 'Delete failed',
        description: formatSupabaseError(err),
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const selectedBrand = brands.find((b) => b.id === brandId);

  return (
    <div className="space-y-8">
      <Card className="border-green-900/30 bg-gray-950/80 p-6">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <Label className="text-gray-300">Brand</Label>
            <Select
              value={brandId || '__none__'}
              onValueChange={(v) => setBrandId(v === '__none__' ? '' : v)}
              disabled={loadingBrands}
            >
              <SelectTrigger className="mt-1 border-green-900/40 bg-gray-900 text-white">
                <SelectValue placeholder="Select brand…" />
              </SelectTrigger>
              <SelectContent className="border-green-900/40 bg-gray-950 text-white">
                <SelectItem value="__none__">— Select —</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {!b.verified ? ' (not verified)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-green-700/40 text-green-400"
            onClick={() => void loadBrands()}
            disabled={loadingBrands}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingBrands ? 'animate-spin' : ''}`} />
            Refresh brands
          </Button>
          {brandId && selectedBrand && !selectedBrand.verified ? (
            <Button type="button" className="bg-amber-600 hover:bg-amber-700" onClick={() => void verifyBrand()}>
              Mark brand verified (show to vendors)
            </Button>
          ) : null}
        </div>
        {selectedBrand ? (
          <p className="text-sm text-gray-500">
            Slug: <code className="text-green-400/90">{selectedBrand.slug}</code>
            {selectedBrand.verified ? (
              <Badge className="ml-2 border-green-600/40 bg-green-950/60 text-green-300">Verified</Badge>
            ) : (
              <Badge className="ml-2 border-amber-600/40 bg-amber-950/50 text-amber-200">Unverified — hidden from vendor catalog</Badge>
            )}
          </p>
        ) : null}
      </Card>

      {brandId ? (
        <>
          <Card className="border-green-900/30 bg-gray-950/80 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Add master catalog SKU</h2>
            <form onSubmit={addProduct} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-gray-300">Product name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 border-green-900/40 bg-gray-900 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1 border-green-900/40 bg-gray-900 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-green-900/40 bg-gray-950 text-white">
                      {PRODUCT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Optional — link strain encyclopedia</Label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StrainEncyclopediaPicker onPick={onPickStrain} disabled={saving} />
                    {strainId ? (
                      <span className="text-sm text-gray-400">
                        {strainLabel ?? strainId.slice(0, 8)}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-7 text-gray-500"
                          onClick={clearStrain}
                        >
                          Clear
                        </Button>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-gray-300">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 border-green-900/40 bg-gray-900 text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-gray-300">Image URLs (one per line)</Label>
                  <Textarea
                    value={imageUrlsText}
                    onChange={(e) => setImageUrlsText(e.target.value)}
                    rows={3}
                    placeholder="https://..."
                    className="mt-1 border-green-900/40 bg-gray-900 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">THC %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={potencyThc}
                    onChange={(e) => setPotencyThc(e.target.value)}
                    className="mt-1 border-green-900/40 bg-gray-900 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">CBD %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={potencyCbd}
                    onChange={(e) => setPotencyCbd(e.target.value)}
                    className="mt-1 border-green-900/40 bg-gray-900 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Avg rating (0–5)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={5}
                    value={avgRating}
                    onChange={(e) => setAvgRating(e.target.value)}
                    className="mt-1 border-green-900/40 bg-gray-900 text-white"
                  />
                  <p className="mt-1 text-xs text-gray-600">Requires DB migration 0100 columns.</p>
                </div>
                <div>
                  <Label className="text-gray-300">Review count</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={reviewCount}
                    onChange={(e) => setReviewCount(e.target.value)}
                    className="mt-1 border-green-900/40 bg-gray-900 text-white"
                  />
                </div>
              </div>
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to master catalog'}
              </Button>
            </form>
          </Card>

          <Card className="border-green-900/30 bg-gray-950/80 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Existing rows ({rows.length})</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-green-800/50 text-green-400"
                onClick={() => void loadCatalogForBrand(brandId)}
                disabled={loadingRows}
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingRows ? 'animate-spin' : ''}`} />
                Refresh list
              </Button>
            </div>
            {loadingRows ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-500">No catalog rows for this brand yet.</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-green-900/25 bg-black/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{r.name}</p>
                      <p className="text-xs text-gray-500">
                        {r.category}
                        {r.potency_thc != null ? ` · THC ${r.potency_thc}%` : ''}
                        {r.images?.[0] ? (
                          <>
                            {' '}
                            ·{' '}
                            <Link
                              href={r.images[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:underline"
                            >
                              image
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                      disabled={deletingId === r.id}
                      onClick={() => void removeRow(r.id)}
                      title="Delete from master catalog"
                    >
                      {deletingId === r.id ? (
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
      ) : (
        <Card className="flex flex-col items-center justify-center border-dashed border-green-900/40 bg-gray-950/40 p-12 text-center text-gray-500">
          <Package className="mb-3 h-10 w-10 opacity-40" />
          <p>Select a brand above to add SKUs or view the master list.</p>
        </Card>
      )}
    </div>
  );
}
