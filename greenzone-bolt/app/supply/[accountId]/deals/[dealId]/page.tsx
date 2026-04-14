'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';

type DealRow = {
  id: string;
  supply_account_id: string;
  headline: string;
  description: string | null;
  discount_percent: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

type CatalogProduct = { id: string; name: string };

export default function SupplyEditDealPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const dealId = typeof params.dealId === 'string' ? params.dealId : '';
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<DealRow | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);

  const load = useCallback(async () => {
    if (!accountId || !dealId) return;
    setLoading(true);
    const { data: dRow, error: dErr } = await supabase.from('b2b_supply_deals').select('*').eq('id', dealId).maybeSingle();
    if (dErr || !dRow) {
      setDeal(null);
      setLoading(false);
      return;
    }
    const d = dRow as DealRow;
    if (d.supply_account_id !== accountId) {
      setDeal(null);
      setLoading(false);
      return;
    }
    setDeal(d);
    setHeadline(d.headline);
    setDescription(d.description ?? '');
    setDiscount(d.discount_percent != null ? String(d.discount_percent) : '');
    setStartsAt(d.starts_at ? d.starts_at.slice(0, 16) : '');
    setEndsAt(d.ends_at ? d.ends_at.slice(0, 16) : '');
    setIsActive(d.is_active);

    const { data: acc } = await supabase.from('supply_accounts').select('brand_id').eq('id', accountId).maybeSingle();
    const bid = (acc as { brand_id: string | null } | null)?.brand_id ?? null;
    setBrandId(bid);

    if (bid) {
      const { data: plist } = await supabase.from('catalog_products').select('id,name').eq('brand_id', bid).order('name');
      setProducts((plist as CatalogProduct[]) ?? []);
    } else {
      setProducts([]);
    }

    const { data: items } = await supabase.from('b2b_supply_deal_items').select('catalog_product_id').eq('deal_id', dealId);
    setSelected(new Set((items ?? []).map((r) => (r as { catalog_product_id: string }).catalog_product_id)));

    setLoading(false);
  }, [accountId, dealId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDeal = async () => {
    const h = headline.trim();
    if (!dealId || !h) {
      toast({ variant: 'destructive', title: 'Headline is required' });
      return;
    }
    const dp = discount.trim() === '' ? null : Number(discount);
    if (discount.trim() !== '' && (Number.isNaN(dp) || dp! < 0 || dp! > 100)) {
      toast({ variant: 'destructive', title: 'Discount must be between 0 and 100' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('b2b_supply_deals')
        .update({
          headline: h,
          description: description.trim() || null,
          discount_percent: dp,
          is_active: isActive,
          starts_at: startsAt.trim() ? new Date(startsAt).toISOString() : null,
          ends_at: endsAt.trim() ? new Date(endsAt).toISOString() : null,
        })
        .eq('id', dealId);
      if (error) throw error;
      toast({ title: 'Deal saved' });
      void load();
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = async () => {
    if (!dealId || !brandId) {
      toast({ variant: 'destructive', title: 'Link a brand to this supply account to attach catalog products.' });
      return;
    }
    setSavingProducts(true);
    try {
      const { data: existing } = await supabase.from('b2b_supply_deal_items').select('id,catalog_product_id').eq('deal_id', dealId);
      const existingIds = new Set((existing ?? []).map((r) => (r as { catalog_product_id: string }).catalog_product_id));
      const toAdd = Array.from(selected).filter((id) => !existingIds.has(id));
      const toRemove = Array.from(existingIds).filter((id) => !selected.has(id));
      if (toRemove.length) {
        const { error: delErr } = await supabase
          .from('b2b_supply_deal_items')
          .delete()
          .eq('deal_id', dealId)
          .in('catalog_product_id', toRemove);
        if (delErr) throw delErr;
      }
      if (toAdd.length) {
        const rows = toAdd.map((catalog_product_id) => ({ deal_id: dealId, catalog_product_id }));
        const { error: insErr } = await supabase.from('b2b_supply_deal_items').insert(rows);
        if (insErr) throw insErr;
      }
      toast({ title: 'Products updated' });
    } catch (e: unknown) {
      toast({ title: 'Could not update products', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setSavingProducts(false);
    }
  };

  const removeDeal = async () => {
    if (!dealId || !confirm('Delete this deal and all attached products?')) return;
    const { error } = await supabase.from('b2b_supply_deals').delete().eq('id', dealId);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Deal deleted' });
    router.push(`/supply/${accountId}/deals`);
  };

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (!accountId || !dealId) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!deal) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/80 p-6 text-zinc-400">
        Deal not found.
        <Button asChild className="mt-4" variant="secondary">
          <Link href={`/supply/${accountId}/deals`}>Back to deals</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-400 hover:text-white">
        <Link href={`/supply/${accountId}/deals`} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Deals
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Edit deal</h1>
          <p className="mt-1 text-sm text-zinc-500">Update messaging and choose which master-catalog products are in this deal.</p>
        </div>
        <Button type="button" variant="destructive" size="sm" onClick={() => void removeDeal()}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete deal
        </Button>
      </div>

      <Card className="space-y-4 border-zinc-800 bg-zinc-900/80 p-6">
        <div>
          <Label>Headline</Label>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Discount %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="mt-1 border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
              <Label htmlFor="active" className="cursor-pointer text-zinc-300">
                Active
              </Label>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Starts (optional)</Label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
          </div>
          <div>
            <Label>Ends (optional)</Label>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-950 text-white" />
          </div>
        </div>
        <Button type="button" disabled={saving} className="bg-green-700 hover:bg-green-600" onClick={() => void saveDeal()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save deal'}
        </Button>
      </Card>

      <Card className="space-y-4 border-zinc-800 bg-zinc-900/80 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Products in this deal</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Uses your brand master catalog. Retail buyers still order via live B2B products; this list scopes what the deal applies to.
          </p>
        </div>
        {!brandId ? (
          <p className="text-sm text-amber-200/90">This supply account has no brand link, so catalog products cannot be attached.</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-zinc-500">No catalog products for this brand yet.</p>
        ) : (
          <ul className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border border-zinc-800 p-3">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-zinc-950/80">
                <Checkbox id={`p-${p.id}`} checked={selected.has(p.id)} onCheckedChange={(v) => toggle(p.id, v === true)} />
                <Label htmlFor={`p-${p.id}`} className="flex-1 cursor-pointer text-sm text-zinc-200">
                  {p.name}
                </Label>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="secondary" disabled={savingProducts || !brandId} onClick={() => void saveProducts()}>
          {savingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save product selection'}
        </Button>
      </Card>
    </div>
  );
}
