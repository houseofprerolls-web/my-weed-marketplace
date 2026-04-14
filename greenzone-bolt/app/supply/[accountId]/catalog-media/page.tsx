'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';

type CatalogRow = {
  id: string;
  name: string;
  images: string[];
};

export default function SupplyCatalogMediaPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const { user } = useAuth();
  const { toast } = useToast();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  /** Local object URLs while a file is uploading — revoked after upload completes. */
  const [uploadPreviewByProduct, setUploadPreviewByProduct] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data: acc, error: aErr } = await supabase
      .from('supply_accounts')
      .select('brand_id')
      .eq('id', accountId)
      .maybeSingle();
    if (aErr || !acc) {
      toast({ variant: 'destructive', title: aErr?.message || 'Account not found' });
      setBrandId(null);
      setRows([]);
      setLoading(false);
      return;
    }
    const bid = (acc as { brand_id: string | null }).brand_id;
    setBrandId(bid);
    if (!bid) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: products, error: pErr } = await supabase
      .from('catalog_products')
      .select('id,name,images')
      .eq('brand_id', bid)
      .order('name');
    if (pErr) {
      toast({ variant: 'destructive', title: pErr.message });
      setRows([]);
    } else {
      const list = (products as CatalogRow[]) ?? [];
      setRows(list);
      const e: Record<string, string[]> = {};
      for (const p of list) {
        e[p.id] = [...(p.images ?? [])];
      }
      setEdits(e);
    }
    setLoading(false);
  }, [accountId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setUrls = (productId: string, urls: string[]) => {
    setEdits((prev) => ({ ...prev, [productId]: urls }));
  };

  const addUrlRow = (productId: string) => {
    const cur = edits[productId] ?? [];
    setUrls(productId, [...cur, '']);
  };

  const updateUrl = (productId: string, index: number, value: string) => {
    const cur = [...(edits[productId] ?? [])];
    cur[index] = value;
    setUrls(productId, cur);
  };

  const removeUrl = (productId: string, index: number) => {
    const cur = [...(edits[productId] ?? [])];
    cur.splice(index, 1);
    setUrls(productId, cur);
  };

  const saveProduct = async (productId: string) => {
    const urls = (edits[productId] ?? []).map((s) => s.trim()).filter(Boolean);
    setSavingId(productId);
    const { error } = await supabase.from('catalog_products').update({ images: urls }).eq('id', productId);
    setSavingId(null);
    if (error) toast({ variant: 'destructive', title: error.message });
    else {
      toast({ title: 'Images saved' });
      setRows((prev) => prev.map((r) => (r.id === productId ? { ...r, images: urls } : r)));
    }
  };

  const onUpload = async (productId: string, file: File) => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' });
      return;
    }
    const preview = URL.createObjectURL(file);
    setUploadPreviewByProduct((prev) => ({ ...prev, [productId]: preview }));
    setUploadingId(productId);
    try {
      const res = await uploadVendorMediaFile(user.id, file);
      if ('error' in res) {
        toast({ variant: 'destructive', title: res.error });
        return;
      }
      const cur = [...(edits[productId] ?? [])].filter((s) => s.trim() !== '');
      setUrls(productId, [...cur, res.url]);
      toast({ title: 'Image uploaded — save to persist on this SKU' });
    } finally {
      URL.revokeObjectURL(preview);
      setUploadPreviewByProduct((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      setUploadingId(null);
    }
  };

  if (!accountId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Catalog media</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Edit master catalog images for your brand SKUs. Uses the public vendor-media bucket (same as storefront
          uploads). Save each product after changes. When you pick a file, you will see a square preview like a typical catalog
          grid tile before the upload finishes.
        </p>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      ) : !brandId ? (
        <Card className="border-zinc-800 bg-zinc-900/80 p-6 text-zinc-400">
          This supply account is not linked to a brand, so there is no shared brand catalog to edit here.
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/80 p-6 text-zinc-400">No catalog products for this brand yet.</Card>
      ) : (
        <ul className="space-y-6">
          {rows.map((p) => (
            <li key={p.id}>
              <Card className="space-y-4 border-zinc-800 bg-zinc-900/80 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">{p.name}</h2>
                    <p className="font-mono text-xs text-zinc-500">{p.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
                      <Upload className="h-4 w-4" />
                      {uploadingId === p.id ? 'Uploading…' : 'Upload file'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingId === p.id}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) void onUpload(p.id, f);
                        }}
                      />
                    </label>
                    <Button type="button" size="sm" variant="secondary" onClick={() => addUrlRow(p.id)}>
                      <Plus className="mr-1 h-4 w-4" />
                      URL row
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-700 hover:bg-green-600"
                      disabled={savingId === p.id}
                      onClick={() => void saveProduct(p.id)}
                    >
                      {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
                {uploadPreviewByProduct[p.id] ? (
                  <div className="rounded-lg border border-zinc-700 bg-black/30 p-3">
                    <p className="mb-2 text-xs font-medium text-zinc-400">Preview (square crop, object-cover)</p>
                    <div className="mx-auto max-w-[220px] overflow-hidden rounded-md border border-zinc-600 aspect-square bg-zinc-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadPreviewByProduct[p.id]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label className="text-zinc-400">Image URLs</Label>
                  {(edits[p.id] ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-500">No images — add a URL or upload a file.</p>
                  ) : (
                    (edits[p.id] ?? []).map((url, i) => (
                      <div key={`${p.id}-${i}`} className="flex items-center gap-2">
                        {/^https?:\/\//i.test(url.trim()) ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-zinc-950">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url.trim()} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <Input
                          value={url}
                          onChange={(e) => updateUrl(p.id, i, e.target.value)}
                          placeholder="https://…"
                          className="border-zinc-700 bg-zinc-950 font-mono text-xs text-white"
                        />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeUrl(p.id, i)}>
                          <Trash2 className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
