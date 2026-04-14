'use client';

import { useEffect, useState } from 'react';
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
import { VendorBrandCatalogAutocomplete, type CatalogSkuPick } from '@/components/vendor/VendorBrandCatalogAutocomplete';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError, rlsHintForCode } from '@/lib/formatSupabaseError';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { StrainEncyclopediaPicker } from '@/components/vendor/StrainEncyclopediaPicker';
import { prefillProductFromEncyclopediaStrain, type EncyclopediaStrain } from '@/lib/strainProductPrefill';
import { mergeHeroImageFirst, parseImageLines } from '@/lib/mergeProductHeroImage';
import { strainImageCandidates } from '@/lib/leaflyStrainImage';
import { VendorImageFitDialog } from '@/components/vendor/VendorImageFitDialog';
import {
  defaultLabelForPreset,
  isQuantityTierPreset,
  QUANTITY_TIER_PRESETS,
  type QuantityTierPreset,
} from '@/lib/productQuantityTiers';
import { sanitizeMenuTextColor } from '@/lib/menuTextColor';

type ShelfSaleMode = 'none' | 'percent' | 'cents';

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
  /** Shown as default shelf name when no brand / custom label. */
  storeName: string;
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
    brand_id?: string | null;
    brand_display_name?: string | null;
    catalog_product_id?: string | null;
    is_featured?: boolean;
    /** 1–99 = percent off list price (optional; not the same as formal deals). */
    sale_discount_percent?: number | null;
    /** Whole cents off list per unit (XOR with percent in DB). */
    sale_discount_cents?: number | null;
    /** #hex for product name on public menu cards; omit/null = default. */
    menu_text_color?: string | null;
    quantity_tiers?: Array<{
      id: string;
      preset: string;
      label: string;
      price_cents: number;
      sort_order: number;
    }>;
  };
};

type TierDraftRow = {
  key: string;
  preset: QuantityTierPreset;
  customLabel: string;
  price: string;
};

function tierDraftsFromInitial(
  initial: Props['initial']
): TierDraftRow[] {
  const t = initial?.quantity_tiers;
  if (!t?.length) return [];
  return [...t]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((row) => ({
      key: row.id || `new_${Math.random().toString(36).slice(2)}`,
      preset: isQuantityTierPreset(row.preset) ? row.preset : 'custom',
      customLabel: row.preset === 'custom' ? row.label : '',
      price: row.price_cents > 0 ? (row.price_cents / 100).toFixed(2) : '',
    }));
}

function displayLabelForTierRow(row: TierDraftRow): string {
  if (row.preset === 'custom') {
    const s = row.customLabel.trim();
    return s || 'Custom';
  }
  return defaultLabelForPreset(row.preset);
}

export function VendorProductForm({ userId, vendorId, storeName, mode, productId, initial }: Props) {
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
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [shelfSaleMode, setShelfSaleMode] = useState<ShelfSaleMode>(() => {
    if (initial?.sale_discount_cents != null && initial.sale_discount_cents >= 1) return 'cents';
    if (initial?.sale_discount_percent != null && initial.sale_discount_percent >= 1) return 'percent';
    return 'none';
  });
  const [saleDiscountPercent, setSaleDiscountPercent] = useState(
    initial?.sale_discount_percent != null && initial.sale_discount_percent > 0
      ? String(initial.sale_discount_percent)
      : ''
  );
  const [saleDiscountDollars, setSaleDiscountDollars] = useState(
    initial?.sale_discount_cents != null && initial.sale_discount_cents >= 1
      ? (initial.sale_discount_cents / 100).toFixed(2)
      : ''
  );
  const [imageUrlsText, setImageUrlsText] = useState((initial?.images ?? []).join('\n'));
  const [heroFitOpen, setHeroFitOpen] = useState(false);
  const [heroFitSrc, setHeroFitSrc] = useState<string | null>(null);
  const [heroFitName, setHeroFitName] = useState('');
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
  const [brandId, setBrandId] = useState<string | null>(initial?.brand_id ?? null);
  const [catalogProductId, setCatalogProductId] = useState<string | null>(
    initial?.catalog_product_id ?? null
  );
  const [brandSearchValue, setBrandSearchValue] = useState('');
  type BrandOpt = { id: string; name: string; slug: string; logo_url: string | null };
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tierRows, setTierRows] = useState<TierDraftRow[]>(() => tierDraftsFromInitial(initial));
  const [menuTextColorHex, setMenuTextColorHex] = useState(() =>
    sanitizeMenuTextColor(initial?.menu_text_color ?? null) ?? ''
  );

  useEffect(() => {
    if (mode !== 'edit' || !initial) return;
    setTierRows(tierDraftsFromInitial(initial));
    setMenuTextColorHex(sanitizeMenuTextColor(initial.menu_text_color ?? null) ?? '');
    if (initial.sale_discount_cents != null && initial.sale_discount_cents >= 1) {
      setShelfSaleMode('cents');
      setSaleDiscountDollars((initial.sale_discount_cents / 100).toFixed(2));
      setSaleDiscountPercent('');
    } else if (initial.sale_discount_percent != null && initial.sale_discount_percent >= 1) {
      setShelfSaleMode('percent');
      setSaleDiscountPercent(String(initial.sale_discount_percent));
      setSaleDiscountDollars('');
    } else {
      setShelfSaleMode('none');
      setSaleDiscountPercent('');
      setSaleDiscountDollars('');
    }
  }, [mode, initial]);

  useEffect(() => {
    if (tierRows.length === 0) return;
    const cents = tierRows
      .map((r) => {
        const n = Number(r.price);
        return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
      })
      .filter((x): x is number => x != null);
    if (cents.length !== tierRows.length || cents.length === 0) return;
    const m = Math.min(...cents);
    setPrice((m / 100).toFixed(2));
  }, [tierRows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id,name,slug,logo_url')
        .eq('verified', true)
        .order('name');
      if (cancelled) return;
      if (error) {
        const r2 = await supabase.from('brands').select('id,name,slug').eq('verified', true).order('name');
        if (!cancelled && !r2.error && r2.data) {
          setBrands(
            (r2.data as { id: string; name: string; slug: string }[]).map((b) => ({ ...b, logo_url: null }))
          );
        }
        return;
      }
      setBrands((data || []) as BrandOpt[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initial) return;
    if (initial.brand_id && brands.length) {
      const b = brands.find((x) => x.id === initial.brand_id);
      if (b) setBrandSearchValue((v) => (v ? v : b.name));
    } else if (initial.brand_display_name?.trim()) {
      setBrandSearchValue((v) => (v ? v : initial.brand_display_name!.trim()));
    }
  }, [initial, brands]);

  async function applyBrandImagesForId(id: string) {
    let hero = brands.find((x) => x.id === id)?.logo_url?.trim() || null;
    if (!hero) {
      const { data: br } = await supabase.from('brands').select('logo_url').eq('id', id).maybeSingle();
      hero = (br as { logo_url?: string } | null)?.logo_url?.trim() || null;
    }
    if (!hero) {
      const { data } = await supabase.from('catalog_products').select('images').eq('brand_id', id).limit(40);
      const row = data?.find((r) => {
        const im = (r as { images?: string[] }).images;
        return Array.isArray(im) && im.length > 0 && String(im[0]).trim();
      });
      const im = row ? (row as { images: string[] }).images : null;
      hero = im?.[0] ? String(im[0]).trim() : null;
    }
    if (!hero) return;
    const brandHeroUrl = hero;
    setImageUrlsText((prev) => {
      if (strainId) {
        const lines = parseImageLines(prev);
        if (lines.includes(brandHeroUrl)) return prev;
        return [...lines, brandHeroUrl].join('\n');
      }
      return mergeHeroImageFirst(brandHeroUrl, prev);
    });
  }

  function clearBrandAndCatalog() {
    setBrandId(null);
    setCatalogProductId(null);
  }

  async function onPickBrandOnly(id: string, name: string) {
    if (!id) {
      clearBrandAndCatalog();
      return;
    }
    setBrandId(id);
    setCatalogProductId(null);
    setBrandSearchValue(name);
    await applyBrandImagesForId(id);
  }

  async function onPickCatalogSku(s: CatalogSkuPick) {
    setBrandId(s.brand_id);
    setCatalogProductId(s.catalog_product_id);
    setBrandSearchValue(s.brand_name);
    setName(s.name);
    setCategory(s.category);
    setDescription(s.description ?? '');
    setPotencyThc(s.potency_thc != null ? String(s.potency_thc) : '');
    setPotencyCbd(s.potency_cbd != null ? String(s.potency_cbd) : '');
    setStrainId(s.strain_id);
    setLinkedStrainName(null);
    setLinkedStrainSlug(null);
    const lines = (s.images || []).filter(Boolean).join('\n');
    if (lines) setImageUrlsText(lines);
  }

  async function applyEncyclopediaStrain(strain: EncyclopediaStrain) {
    const p = prefillProductFromEncyclopediaStrain(strain);
    setStrainId(p.strain_id);
    setLinkedStrainName(strain.name);
    setLinkedStrainSlug(strain.slug);
    setName(p.name);
    setDescription(p.description);
    setPotencyThc(p.potency_thc);
    setPotencyCbd(p.potency_cbd);
    let hero = p.hero_image_url?.trim() || null;
    if (!hero) {
      const { data } = await supabase.from('strains').select('image_url').eq('id', strain.id).maybeSingle();
      hero = (data as { image_url?: string } | null)?.image_url?.trim() || null;
    }
    const candidates = strainImageCandidates(hero, strain.slug);
    const first = candidates[0];
    if (first) {
      // Replace the image input when picking a new encyclopedia strain (avoid stacking old + new picks).
      setImageUrlsText(mergeHeroImageFirst(first, ''));
    }
  }

  function clearStrainLink() {
    setStrainId(null);
    setLinkedStrainName(null);
    setLinkedStrainSlug(null);
  }

  function openHeroImageFit(file: File) {
    setHeroFitSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setHeroFitName(file.name);
    setHeroFitOpen(true);
  }

  function onHeroFitOpenChange(open: boolean) {
    setHeroFitOpen(open);
    if (!open) {
      setHeroFitSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setHeroFitName('');
    }
  }

  async function applyHeroUpload(file: File) {
    const res = await uploadVendorMediaFile(userId, file);
    if ('error' in res) {
      toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
      return;
    }
    setImageUrlsText((prev) => mergeHeroImageFirst(res.url, prev));
    toast({
      title: 'Image uploaded',
      description: 'Set as the first (hero) photo. Earlier URLs move below; delete lines you do not need.',
    });
  }

  function onUploadFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) openHeroImageFit(file);
    e.target.value = '';
  }

  async function syncTiersForProduct(
    pid: string,
    tiers: { preset: QuantityTierPreset; label: string; priceCents: number }[]
  ) {
    const { error: delErr } = await supabase.from('product_quantity_tiers').delete().eq('product_id', pid);
    if (delErr && !/does not exist|relation|Could not find/i.test(String(delErr.message || ''))) {
      throw delErr;
    }
    if (tiers.length === 0) return;
    const { error: insErr } = await supabase.from('product_quantity_tiers').insert(
      tiers.map((t, i) => ({
        product_id: pid,
        sort_order: i,
        preset: t.preset,
        label: t.label,
        price_cents: t.priceCents,
      }))
    );
    if (insErr) throw insErr;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedTiers: { preset: QuantityTierPreset; label: string; priceCents: number }[] = [];
    if (tierRows.length > 0) {
      for (const row of tierRows) {
        const pn = Number(row.price);
        if (!Number.isFinite(pn) || pn < 0) {
          toast({
            title: 'Check quantity options',
            description: 'Each option needs a valid price (0 or more).',
            variant: 'destructive',
          });
          return;
        }
        if (row.preset === 'custom' && !row.customLabel.trim()) {
          toast({
            title: 'Custom label required',
            description: 'Enter a label for each custom quantity.',
            variant: 'destructive',
          });
          return;
        }
        normalizedTiers.push({
          preset: row.preset,
          label: displayLabelForTierRow(row).slice(0, 80),
          priceCents: Math.round(pn * 100),
        });
      }
    }

    const priceNum = Number(price);
    if (!name.trim()) {
      toast({ title: 'Check product', description: 'Product name is required.', variant: 'destructive' });
      return;
    }
    if (normalizedTiers.length === 0) {
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        toast({ title: 'Check product', description: 'Name and a valid price are required.', variant: 'destructive' });
        return;
      }
    } else if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast({
        title: 'Check quantity options',
        description: 'Fix tier prices before saving.',
        variant: 'destructive',
      });
      return;
    }

    const priceCents =
      normalizedTiers.length > 0
        ? Math.min(...normalizedTiers.map((t) => t.priceCents))
        : Math.round(priceNum * 100);
    const inv = Math.max(0, Math.floor(Number(inventoryCount) || 0));
    const images = parseImageLines(imageUrlsText);
    const costNum = unitCost.trim() === '' ? 0 : Number(unitCost);
    const unitCostCents =
      Number.isFinite(costNum) && costNum >= 0 ? Math.round(costNum * 100) : 0;
    const thcNum = potencyThc.trim() === '' ? null : Number(potencyThc);
    const cbdNum = potencyCbd.trim() === '' ? null : Number(potencyCbd);
    const potency_thc =
      thcNum != null && Number.isFinite(thcNum) && thcNum >= 0 && thcNum <= 100 ? thcNum : null;
    const potency_cbd =
      cbdNum != null && Number.isFinite(cbdNum) && cbdNum >= 0 && cbdNum <= 100 ? cbdNum : null;

    const brand_display_name =
      !brandId && brandSearchValue.trim() ? brandSearchValue.trim().slice(0, 240) : null;

    const salePctRaw = saleDiscountPercent.trim() === '' ? null : Number(saleDiscountPercent);
    const sale_discount_percent =
      shelfSaleMode === 'percent' &&
      salePctRaw != null &&
      Number.isFinite(salePctRaw) &&
      salePctRaw >= 1 &&
      salePctRaw <= 99
        ? Math.round(salePctRaw)
        : null;
    const dollarsRaw = saleDiscountDollars.trim() === '' ? null : Number(saleDiscountDollars);
    const sale_discount_cents =
      shelfSaleMode === 'cents' &&
      dollarsRaw != null &&
      Number.isFinite(dollarsRaw) &&
      dollarsRaw > 0
        ? Math.round(dollarsRaw * 100)
        : null;

    const basePayload = {
      strain_id: strainId,
      brand_id: brandId,
      catalog_product_id: brandId ? catalogProductId : null,
      brand_display_name,
      name: name.trim(),
      category,
      price_cents: priceCents,
      inventory_count: inv,
      in_stock: inStock,
      is_featured: isFeatured,
      description: description.trim() || null,
      images,
      potency_thc,
      potency_cbd,
      sale_discount_percent,
      sale_discount_cents,
      menu_text_color: sanitizeMenuTextColor(menuTextColorHex),
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        const tryInsert = async (payload: Record<string, unknown>) =>
          supabase.from('products').insert({ ...payload, vendor_id: vendorId }).select('id').maybeSingle();

        let { data, error } = await tryInsert(basePayload);
        if (
          error &&
          /brand_display_name|catalog_product_id|is_featured|sale_discount_percent|sale_discount_cents|menu_text_color|column|does not exist/i.test(
            String(error.message || '')
          )
        ) {
          const {
            brand_display_name: _bd,
            catalog_product_id: _cp,
            is_featured: _if,
            sale_discount_percent: _sd,
            sale_discount_cents: _sdc,
            menu_text_color: _mtc,
            ...rest
          } = basePayload;
          const r2 = await tryInsert(rest);
          data = r2.data;
          error = r2.error;
        }

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
        try {
          await syncTiersForProduct(id, normalizedTiers);
        } catch (te: unknown) {
          console.error('syncTiersForProduct', te);
          toast({
            title: 'SKU created — quantity options not saved',
            description: formatSupabaseError(te),
            variant: 'destructive',
          });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast({ title: 'SKU created successfully' });
        // Reset form for quick multi-add flows.
        setName('');
        setCategory('flower');
        setPrice('');
        setTierRows([]);
        setUnitCost('');
        setDescription('');
        setInventoryCount('0');
        setInStock(true);
        setIsFeatured(false);
        setShelfSaleMode('none');
        setSaleDiscountPercent('');
        setSaleDiscountDollars('');
        setImageUrlsText('');
        setStrainId(null);
        setLinkedStrainName(null);
        setLinkedStrainSlug(null);
        setPotencyThc('');
        setPotencyCbd('');
        setBrandId(null);
        setBrandSearchValue('');
        setCatalogProductId(null);
        setMenuTextColorHex('');
        router.refresh();
        return;
      }

      if (!productId) return;
      let { error } = await supabase
        .from('products')
        .update(basePayload as Record<string, unknown>)
        .eq('id', productId)
        .eq('vendor_id', vendorId);

      if (
        error &&
        /brand_display_name|catalog_product_id|is_featured|sale_discount_percent|sale_discount_cents|menu_text_color|column|does not exist/i.test(
          String(error.message || '')
        )
      ) {
        const {
          brand_display_name: _bd,
          catalog_product_id: _cp,
          is_featured: _if,
          sale_discount_percent: _sd,
          sale_discount_cents: _sdc,
          menu_text_color: _mtc,
          ...rest
        } = basePayload;
        const r2 = await supabase
          .from('products')
          .update(rest as Record<string, unknown>)
          .eq('id', productId)
          .eq('vendor_id', vendorId);
        error = r2.error;
      }

      if (error) throw error;

      const { error: cErr } = await supabase.from('product_unit_costs').upsert(
        { product_id: productId, unit_cost_cents: unitCostCents },
        { onConflict: 'product_id' }
      );
      if (cErr) throw cErr;

      await syncTiersForProduct(productId, normalizedTiers);

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
    <>
      <VendorImageFitDialog
        open={heroFitOpen}
        onOpenChange={onHeroFitOpenChange}
        imageSrc={heroFitSrc}
        aspect={3 / 4}
        title="Position product photo"
        description="Drag and zoom to frame the hero shot (menu cards use a tall frame). Then we upload the cropped image."
        maxOutputLongEdge={2048}
        outputBaseName={heroFitName}
        onApply={async (file) => {
          await applyHeroUpload(file);
        }}
      />
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

      <div className="rounded-lg border border-green-900/25 bg-gray-950/40 p-4">
        <Label>Menu title color (optional)</Label>
        <p className="mt-1 text-xs text-gray-500">
          On your public menu, the product name uses this color so it stays readable on custom SKU card backgrounds.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="color"
            aria-label="Pick menu title color"
            value={menuTextColorHex || '#ffffff'}
            onChange={(e) => setMenuTextColorHex(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-green-900/40 bg-gray-900 p-0"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-green-800/50"
            onClick={() => setMenuTextColorHex('')}
          >
            Use default (white)
          </Button>
        </div>
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

      <div className="rounded-lg border border-green-900/25 bg-gray-950/40 p-4">
        <VendorBrandCatalogAutocomplete
          value={brandSearchValue}
          onChange={setBrandSearchValue}
          onPickSku={(s) => void onPickCatalogSku(s)}
          onPickBrandOnly={(id, name) => void onPickBrandOnly(id, name)}
          onClear={clearBrandAndCatalog}
          disabled={saving}
        />
        <p className="mt-2 text-xs text-gray-500">
          Type to search master catalog SKUs or verified brands. Pick a SKU to autofill the form. With no linked brand,
          the text you type is saved as the shelf label (defaults to <span className="text-gray-400">{storeName}</span>{' '}
          on menus if left empty).
        </p>
        <div className="mt-4">
          <Label className="text-gray-400">Or choose brand from list (logo / catalog photo only)</Label>
          <Select
            value={brandId ?? '__none__'}
            onValueChange={(v) => {
              if (v === '__none__') {
                setBrandId(null);
                setCatalogProductId(null);
                return;
              }
              void onPickBrandOnly(v, brands.find((b) => b.id === v)?.name ?? '');
            }}
          >
            <SelectTrigger className="mt-1 border-green-900/30 bg-gray-900">
              <SelectValue placeholder="No brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No brand</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      <div className="rounded-lg border border-green-900/30 bg-gray-950/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label className="text-white">Quantity / weight options</Label>
            <p className="mt-1 text-xs text-gray-500">
              Add 3.5g, 7g, 14g, 28g, or custom sizes — each with its own price on this SKU. Leave empty to use a single
              retail price only.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-green-800/50 shrink-0"
            onClick={() =>
              setTierRows((rows) => [
                ...rows,
                {
                  key: `new_${crypto.randomUUID()}`,
                  preset: '3_5g',
                  customLabel: '',
                  price: '',
                },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add option
          </Button>
        </div>
        {tierRows.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {tierRows.map((row) => (
              <li
                key={row.key}
                className="flex flex-col gap-2 rounded-md border border-green-900/25 bg-black/30 p-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="min-w-[8rem] flex-1">
                  <Label className="text-xs text-gray-400">Preset</Label>
                  <Select
                    value={row.preset}
                    onValueChange={(v) =>
                      setTierRows((rows) =>
                        rows.map((r) =>
                          r.key === row.key
                            ? {
                                ...r,
                                preset: isQuantityTierPreset(v) ? v : 'custom',
                                customLabel: v === 'custom' ? r.customLabel : '',
                              }
                            : r
                        )
                      )
                    }
                  >
                    <SelectTrigger className="mt-1 border-green-900/30 bg-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_TIER_PRESETS.map((pv) => (
                        <SelectItem key={pv} value={pv}>
                          {defaultLabelForPreset(pv)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {row.preset === 'custom' ? (
                  <div className="min-w-[10rem] flex-1">
                    <Label className="text-xs text-gray-400">Custom label</Label>
                    <Input
                      value={row.customLabel}
                      onChange={(e) =>
                        setTierRows((rows) =>
                          rows.map((r) => (r.key === row.key ? { ...r, customLabel: e.target.value } : r))
                        )
                      }
                      placeholder="e.g. 1/2 oz"
                      className="mt-1 border-green-900/30 bg-gray-900"
                    />
                  </div>
                ) : (
                  <div className="flex min-w-[8rem] flex-1 items-center pb-2 text-sm text-gray-400">
                    Menu label: <span className="ml-1 text-white">{defaultLabelForPreset(row.preset)}</span>
                  </div>
                )}
                <div className="w-full min-w-[6rem] sm:w-28">
                  <Label className="text-xs text-gray-400">Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={row.price}
                    onChange={(e) =>
                      setTierRows((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, price: e.target.value } : r))
                      )
                    }
                    className="mt-1 border-green-900/30 bg-gray-900"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-gray-500 hover:text-red-400"
                  aria-label="Remove option"
                  onClick={() => setTierRows((rows) => rows.filter((r) => r.key !== row.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
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
            readOnly={tierRows.length > 0}
            className={`mt-1 border-green-900/30 bg-gray-900 ${tierRows.length > 0 ? 'cursor-not-allowed opacity-80' : ''}`}
            required
          />
          {tierRows.length > 0 ? (
            <p className="mt-1 text-xs text-gray-500">Auto-set to the lowest tier price for sorting and deals.</p>
          ) : null}
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

      <div className="rounded-lg border border-amber-800/35 bg-amber-950/15 p-4 space-y-3">
        <Label>On sale (optional shelf markdown)</Label>
        <p className="text-xs text-gray-500">
          List price stays as entered; choose <span className="text-gray-300">percent off</span> or{' '}
          <span className="text-gray-300">dollars off</span> per unit — not both. Formal bundles / schedules live under{' '}
          <span className="text-gray-300">Deals &amp; Offers</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['none', 'No sale'],
              ['percent', '% off'],
              ['cents', '$ off'],
            ] as const
          ).map(([k, label]) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={shelfSaleMode === k ? 'default' : 'outline'}
              className={
                shelfSaleMode === k ? 'bg-amber-600 text-white hover:bg-amber-700' : 'border-amber-900/40 text-gray-200'
              }
              onClick={() => setShelfSaleMode(k)}
            >
              {label}
            </Button>
          ))}
        </div>
        {shelfSaleMode === 'percent' ? (
          <div>
            <Label className="text-gray-300">Percent off list (1–99)</Label>
            <Input
              type="number"
              step={1}
              min={1}
              max={99}
              value={saleDiscountPercent}
              onChange={(e) => setSaleDiscountPercent(e.target.value)}
              placeholder="e.g. 15"
              className="mt-1 border-green-900/30 bg-gray-900"
            />
          </div>
        ) : null}
        {shelfSaleMode === 'cents' ? (
          <div>
            <Label className="text-gray-300">Dollars off each unit (USD)</Label>
            <Input
              type="number"
              step="0.01"
              min={0.01}
              value={saleDiscountDollars}
              onChange={(e) => setSaleDiscountDollars(e.target.value)}
              placeholder="e.g. 5.00"
              className="mt-1 border-green-900/30 bg-gray-900"
            />
          </div>
        ) : null}
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

      <div className="flex items-end gap-3 rounded-md border border-amber-700/30 bg-amber-950/20 px-3 py-2">
        <Switch id="is_featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
        <Label htmlFor="is_featured">Feature this SKU at the top of the public menu (horizontal rail)</Label>
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
        <p className="mb-2 text-xs text-gray-500">
          One URL per line (top = menu hero). Choosing a file opens a positioning step, then upload puts it first.
          Master-catalog SKUs may paste URLs from the shared import (often another store’s bucket)—upload your own shot
          or delete those lines if the wrong picture appears.
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mb-2 block text-sm text-gray-400 file:mr-3 file:rounded file:border-0 file:bg-green-700 file:px-3 file:py-1.5 file:text-white"
          onChange={onUploadFilePick}
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
    </>
  );
}
