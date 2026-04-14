'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError, rlsHintForCode } from '@/lib/formatSupabaseError';
import { Loader2, Trash2, X } from 'lucide-react';
import { StrainEncyclopediaPicker } from '@/components/vendor/StrainEncyclopediaPicker';
import { prefillProductFromEncyclopediaStrain, type EncyclopediaStrain } from '@/lib/strainProductPrefill';

export const PRODUCT_CATEGORIES = [
  { value: 'flower', label: 'Flower' },
  { value: 'edible', label: 'Edible' },
  { value: 'vape', label: 'Vape' },
  { value: 'concentrate', label: 'Concentrate' },
  { value: 'topical', label: 'Topical' },
  { value: 'preroll', label: 'Pre-roll' },
  { value: 'other', label: 'Other' },
] as const;

type Props = {
  userId: string;
  vendorId: string;
  mode: 'create' | 'edit';
  productId?: string;
  initial?: {
    name: string;
    category: string;
    priceCents: number;
    description: string;
    inventory_count: number;
    in_stock: boolean;
    images: string[];
    unit_cost_cents: number;
    strain_id?: string | null;
    strain_name?: string | null;
    strain_slug?: string | null;
    potency_thc?: number | null;
    potency_cbd?: number | null;
  };
};

function parseImageList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function VendorProductForm({ userId, vendorId, mode, productId, initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const vendorMenuReturn = (() => {
    const v = searchParams.get('vendor')?.trim();
    if (!v) return '/vendor/menu';
    return `/vendor/menu?${new URLSearchParams({ vendor: v }).toString()}`;
  })();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'flower');
  const [price, setPrice] = useState(initial ? (initial.priceCents / 100).toFixed(2) : '');
  const [unitCost, setUnitCost] = useState(
    initial && initial.unit_cost_cents > 0 ? (initial.unit_cost_cents / 100).toFixed(2) : ''
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [inventoryCount, setInventoryCount] = useState(String(initial?.inventory_count ?? 0));
  const [inStock, setInStock] = useState(initial?.in_stock ?? true);
  const [imageUrlsText, setImageUrlsText] = useState((initial?.images ?? []).join('\n'));
  const [strainId, setStrainId] = useState<string | null>(initial?.strain_id ?? null);
  const [linkedStrainName, setLinkedStrainName] = useState<string | null>(initial?.strain_name ?? null);
  const [linkedStrainSlug, setLinkedStrainSlug] = useState<string | null>(initial?.strain_slug ?? null);
  const [potencyThc, setPotencyThc] = useState(
    initial?.potency_thc != null && Number.isFinite(initial.potency_thc)
      ? String(initial.potency_thc)
      : ''
  );
  const [potencyCbd, setPotencyCbd] = useState(
    initial?.potency_cbd != null && Number.isFinite(initial.potency_cbd)
      ? String(initial.potency_cbd)
      : ''
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function applyEncyclopediaStrain(strain: EncyclopediaStrain) {
    const p = prefillProductFromEncyclopediaStrain(strain);
    setStrainId(p.strain_id);
    setLinkedStrainName(strain.name);
    setLinkedStrainSlug(strain.slug);
    setName(p.name);
    setDescription(p.description);
    setPotencyThc(p.potency_thc);
    setPotencyCbd(p.potency_cbd);
    if (p.hero_image_url) {
      setImageUrlsText((prev) => {
        const lines = parseImageList(prev);
        if (lines.includes(p.hero_image_url!)) return prev;
        return [p.hero_image_url!, ...lines].join('\n');
      });
    }
  }

  function clearStrainLink() {
    setStrainId(null);
    setLinkedStrainName(null);
    setLinkedStrainSlug(null);
  }

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadVendorMediaFile(userId, file);
    if ('error' in res) {
      toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
      return;
    }
    setImageUrlsText((prev) => (prev.trim() ? `${prev.trim()}\n${res.url}` : res.url));
    toast({ title: 'Image uploaded', description: 'URL added to the list.' });
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Number(price);
    if (!name.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
      toast({ title: 'Check product', description: 'Name and a valid price are required.', variant: 'destructive' });
      return;
    }
    const priceCents = Math.round(priceNum * 100);
    const inv = Math.max(0, Math.floor(Number(inventoryCount) || 0));
    const images = parseImageList(imageUrlsText);
    const costNum = unitCost.trim() === '' ? 0 : Number(unitCost);
    const unitCostCents =
      Number.isFinite(costNum) && costNum >= 0 ? Math.round(costNum * 100) : 0;
    const thcNum = potencyThc.trim() === '' ? null : Number(potencyThc);
    const cbdNum = potencyCbd.trim() === '' ? null : Number(potencyCbd);
    const potency_thc =
      thcNum != null && Number.isFinite(thcNum) && thcNum >= 0 && thcNum <= 100 ? thcNum : null;
    const potency_cbd =
      cbdNum != null && Number.isFinite(cbdNum) && cbdNum >= 0 && cbdNum <= 100 ? cbdNum : null;

    setSaving(true);
    try {
      if (mode === 'create') {
        const { data, error } = await supabase
          .from('products')
          .insert({
            vendor_id: vendorId,
            strain_id: strainId,
            name: name.trim(),
            category,
            price_cents: priceCents,
            inventory_count: inv,
            in_stock: inStock,
            description: description.trim() || null,
            images,
            potency_thc,
            potency_cbd,
          })
          .select('id')
          .maybeSingle();

        if (error) throw error;
        const id = data?.id as string | undefined;
        if (!id) {
          throw {
            message:
              'Insert may have succeeded but the app could not read the new row (often RLS / RETURNING). Check products SELECT policies for your role, or refresh the menu.',
            code: 'PGRST_NO_ROW',
          };
        }
        if (id && unitCostCents > 0) {
          const { error: cErr } = await supabase.from('product_unit_costs').upsert(
            { product_id: id, unit_cost_cents: unitCostCents },
            { onConflict: 'product_id' }
          );
          if (cErr) throw cErr;
        }
        toast({ title: 'Product created' });
        router.push(vendorMenuReturn);
        router.refresh();
        return;
      }

      if (!productId) return;
      const { error } = await supabase
        .from('products')
        .update({
          strain_id: strainId,
          name: name.trim(),
          category,
          price_cents: priceCents,
          inventory_count: inv,
          in_stock: inStock,
          description: description.trim() || null,
          images,
          potency_thc,
          potency_cbd,
        })
        .eq('id', productId)
        .eq('vendor_id', vendorId);

      if (error) throw error;

      const { error: cErr } = await supabase.from('product_unit_costs').upsert(
        { product_id: productId, unit_cost_cents: unitCostCents },
        { onConflict: 'product_id' }
      );
      if (cErr) throw cErr;

      toast({ title: 'Saved' });
      router.push(vendorMenuReturn);
      router.refresh();
    } catch (err: unknown) {
      console.error('VendorProductForm save', err);
      const msg = formatSupabaseError(err);
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : undefined;
      const hint = rlsHintForCode(code);
      toast({
        title: 'Could not save',
        description: hint ? `${msg} — ${hint}` : msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!productId || mode !== 'edit') return;
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId).eq('vendor_id', vendorId);
      if (error) throw error;
      toast({ title: 'Product deleted' });
      router.push(vendorMenuReturn);
      router.refresh();
    } catch (err: unknown) {
      console.error('VendorProductForm delete', err);
      toast({
        title: 'Delete failed',
        description: formatSupabaseError(err),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 text-white">
      <StrainEncyclopediaPicker onPick={applyEncyclopediaStrain} disabled={saving} />
      {strainId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-green-800/40 bg-green-950/20 px-3 py-2 text-sm">
          <span className="text-gray-300">
            Linked to encyclopedia{linkedStrainName ? `: ${linkedStrainName}` : ''}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-gray-400 hover:text-white"
            onClick={clearStrainLink}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Unlink
          </Button>
          {linkedStrainSlug ? (
            <Link
              href={`/strains/${encodeURIComponent(linkedStrainSlug)}`}
              className="ml-auto text-xs text-brand-lime hover:underline"
            >
              View strain page
            </Link>
          ) : null}
        </div>
      ) : null}

      <div>
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 border-green-900/30 bg-gray-900"
          required
        />
      </div>

      <div>
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="mt-1 border-green-900/30 bg-gray-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>THC % (menu)</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={potencyThc}
            onChange={(e) => setPotencyThc(e.target.value)}
            placeholder="e.g. 22.5"
            className="mt-1 border-green-900/30 bg-gray-900"
          />
          <p className="mt-1 text-xs text-gray-500">Prefilled from encyclopedia; adjust to match your batch.</p>
        </div>
        <div>
          <Label>CBD % (menu)</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={potencyCbd}
            onChange={(e) => setPotencyCbd(e.target.value)}
            placeholder="Optional"
            className="mt-1 border-green-900/30 bg-gray-900"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Retail price (USD)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 border-green-900/30 bg-gray-900"
            required
          />
        </div>
        <div>
          <Label>Your cost per unit (USD)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className="mt-1 border-green-900/30 bg-gray-900"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">Used for margin on menu and orders (not shown to shoppers).</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Inventory count</Label>
          <Input
            type="number"
            min={0}
            value={inventoryCount}
            onChange={(e) => setInventoryCount(e.target.value)}
            className="mt-1 border-green-900/30 bg-gray-900"
          />
        </div>
        <div className="flex items-end gap-3 pb-2">
          <Switch id="in_stock" checked={inStock} onCheckedChange={setInStock} />
          <Label htmlFor="in_stock">In stock / visible in catalog</Label>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 border-green-900/30 bg-gray-900"
        />
      </div>

      <div>
        <Label>Product images</Label>
        <p className="mb-2 text-xs text-gray-500">One image URL per line, or upload files (stored in your folder).</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mb-2 block text-sm text-gray-400 file:mr-3 file:rounded file:border-0 file:bg-green-700 file:px-3 file:py-1.5 file:text-white"
          onChange={onUploadFile}
        />
        <Textarea
          value={imageUrlsText}
          onChange={(e) => setImageUrlsText(e.target.value)}
          rows={4}
          placeholder="https://..."
          className="border-green-900/30 bg-gray-900"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-gray-600"
          onClick={() => router.push(vendorMenuReturn)}
        >
          Cancel
        </Button>
        {mode === 'edit' && (
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
            className="ml-auto gap-2"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
