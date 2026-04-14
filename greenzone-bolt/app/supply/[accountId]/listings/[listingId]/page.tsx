'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { b2bListingTitle, type B2bListingRow } from '@/lib/b2bListingDisplay';

const CATEGORIES = ['flower', 'edible', 'vape', 'concentrate', 'topical', 'preroll', 'other'] as const;

type Listing = B2bListingRow & {
  description: string | null;
  category: string;
  moq: number | null;
  case_size: string | null;
  list_price_cents: number | null;
  visibility: 'draft' | 'live';
  buyer_showcase_rank: number | null;
};

type Promo = {
  id: string;
  headline: string;
  discount_percent: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export default function SupplyEditListingPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const listingId = typeof params.listingId === 'string' ? params.listingId : '';
  const router = useRouter();
  const { toast } = useToast();
  const [row, setRow] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleOverride, setTitleOverride] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [moq, setMoq] = useState('');
  const [caseSize, setCaseSize] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [visibility, setVisibility] = useState<'draft' | 'live'>('draft');
  const [promos, setPromos] = useState<Promo[]>([]);
  const [ph, setPh] = useState('');
  const [pd, setPd] = useState('');
  const [buyerShowcaseRank, setBuyerShowcaseRank] = useState('');

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('b2b_listings')
      .select(
        'id,title_override,catalog_product_id,description,category,moq,case_size,list_price_cents,visibility,buyer_showcase_rank,catalog_products(name)'
      )
      .eq('id', listingId)
      .eq('supply_account_id', accountId)
      .maybeSingle();
    if (error || !data) {
      setRow(null);
      setLoading(false);
      return;
    }
    const L = data as Listing;
    setRow(L);
    setTitleOverride(L.title_override ?? '');
    setDescription(L.description ?? '');
    setCategory(L.category);
    setMoq(L.moq != null ? String(L.moq) : '');
    setCaseSize(L.case_size ?? '');
    setListPrice(L.list_price_cents != null ? String(L.list_price_cents / 100) : '');
    setVisibility(L.visibility);
    setBuyerShowcaseRank(
      L.buyer_showcase_rank != null && L.buyer_showcase_rank >= 1 ? String(L.buyer_showcase_rank) : ''
    );

    const { data: pr } = await supabase
      .from('b2b_listing_promos')
      .select('id,headline,discount_percent,is_active,starts_at,ends_at')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    setPromos((pr as Promo[]) ?? []);
    setLoading(false);
  }, [listingId, accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveListing = async () => {
    if (!row) return;
    const title = titleOverride.trim() || null;
    if (!row.catalog_product_id && !title) {
      toast({ variant: 'destructive', title: 'Title required when no catalog SKU' });
      return;
    }
    const listCents =
      listPrice.trim() === '' ? null : Math.round(parseFloat(listPrice) * 100);
    const rankRaw = buyerShowcaseRank.trim();
    const rankParsed = rankRaw === '' ? null : parseInt(rankRaw, 10);
    const buyer_rank =
      rankParsed != null && Number.isFinite(rankParsed) && rankParsed >= 1 && rankParsed <= 999
        ? rankParsed
        : null;
    setSaving(true);
    const { error } = await supabase
      .from('b2b_listings')
      .update({
        title_override: title,
        description: description.trim() || null,
        category,
        moq: moq.trim() === '' ? null : parseInt(moq, 10),
        case_size: caseSize.trim() || null,
        list_price_cents: listCents != null && Number.isFinite(listCents) ? listCents : null,
        visibility,
        buyer_showcase_rank: buyer_rank,
      })
      .eq('id', row.id);
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return;
    }
    toast({ title: 'Saved' });
    void load();
  };

  const addPromo = async () => {
    if (!listingId || !ph.trim()) return;
    const pct = pd.trim() === '' ? null : parseFloat(pd);
    const { error } = await supabase.from('b2b_listing_promos').insert({
      listing_id: listingId,
      headline: ph.trim(),
      discount_percent: pct != null && Number.isFinite(pct) ? pct : null,
      is_active: true,
    });
    if (error) {
      toast({ variant: 'destructive', title: 'Promo failed', description: error.message });
      return;
    }
    setPh('');
    setPd('');
    void load();
  };

  const deletePromo = async (id: string) => {
    const { error } = await supabase.from('b2b_listing_promos').delete().eq('id', id);
    if (error) toast({ variant: 'destructive', title: error.message });
    else void load();
  };

  const deleteListing = async () => {
    if (!row || !confirm('Delete this product?')) return;
    const { error } = await supabase.from('b2b_listings').delete().eq('id', row.id);
    if (error) {
      toast({ variant: 'destructive', title: error.message });
      return;
    }
    router.push(`/supply/${accountId}/listings`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }
  if (!row) {
    return <Card className="border-zinc-800 bg-zinc-900 p-6 text-zinc-400">Product not found.</Card>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-400">
        <Link href={`/supply/${accountId}/listings`} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Products
        </Link>
      </Button>
      <div>
        <h1 className="text-xl font-bold text-white">Edit product</h1>
        <p className="mt-1 text-sm text-zinc-500">{b2bListingTitle(row)}</p>
      </div>
      <Card className="space-y-4 border-zinc-800 bg-zinc-900 p-4">
        <div>
          <Label className="text-zinc-400">Title override</Label>
          <Input
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            className="mt-1 border-zinc-700 bg-background text-foreground"
          />
        </div>
        <div>
          <Label className="text-zinc-400">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1 border-zinc-700 bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-zinc-400">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 border-zinc-700 bg-background text-foreground"
            rows={3}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-zinc-400">MOQ</Label>
            <Input value={moq} onChange={(e) => setMoq(e.target.value)} className="mt-1 border-zinc-700 bg-background text-foreground" />
          </div>
          <div>
            <Label className="text-zinc-400">Case size</Label>
            <Input
              value={caseSize}
              onChange={(e) => setCaseSize(e.target.value)}
              className="mt-1 border-zinc-700 bg-background text-foreground"
            />
          </div>
        </div>
        <div>
          <Label className="text-zinc-400">List price (USD)</Label>
          <Input value={listPrice} onChange={(e) => setListPrice(e.target.value)} className="mt-1 border-zinc-700 bg-background text-foreground" />
        </div>
        <div>
          <Label className="text-zinc-400">Visibility</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as 'draft' | 'live')}>
            <SelectTrigger className="mt-1 border-zinc-700 bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-zinc-400">Buyer showcase rank (optional)</Label>
          <Input
            inputMode="numeric"
            placeholder="e.g. 1 = first after deal SKUs"
            value={buyerShowcaseRank}
            onChange={(e) => setBuyerShowcaseRank(e.target.value.replace(/\D/g, ''))}
            className="mt-1 border-zinc-700 bg-background text-foreground"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Whole number 1–999. Lower appears sooner on the buyer catalog (after products in an active supply deal).
            Leave empty for default ordering.
          </p>
        </div>
        <Button type="button" disabled={saving} onClick={() => void saveListing()} className="w-full bg-green-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save product'}
        </Button>
        <Button type="button" variant="destructive" className="w-full" onClick={() => void deleteListing()}>
          Delete product
        </Button>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Promos</h2>
        <p className="mb-3 text-sm text-zinc-500">
          These promos apply to this product only. For account-wide campaigns, use{' '}
          <Link href={`/supply/${accountId}/deals`} className="text-green-400 hover:underline">
            Deals
          </Link>
          .
        </p>
        <Card className="mb-4 space-y-3 border-zinc-800 bg-zinc-900 p-4">
          <div>
            <Label className="text-zinc-400">Headline</Label>
            <Input value={ph} onChange={(e) => setPh(e.target.value)} className="mt-1 border-zinc-700 bg-background text-foreground" />
          </div>
          <div>
            <Label className="text-zinc-400">Discount % (optional)</Label>
            <Input value={pd} onChange={(e) => setPd(e.target.value)} className="mt-1 border-zinc-700 bg-background text-foreground" />
          </div>
          <Button type="button" variant="secondary" onClick={() => void addPromo()}>
            Add promo
          </Button>
        </Card>
        <ul className="space-y-2">
          {promos.map((p) => (
            <li key={p.id}>
              <Card className="flex items-center justify-between gap-2 border-zinc-800 bg-zinc-900 p-3">
                <div>
                  <p className="font-medium text-white">{p.headline}</p>
                  <p className="text-xs text-zinc-500">
                    {p.discount_percent != null ? `${p.discount_percent}% · ` : null}
                    {p.is_active ? 'active' : 'inactive'}
                  </p>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => void deletePromo(p.id)}>
                  <Trash2 className="h-4 w-4 text-zinc-500" />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
