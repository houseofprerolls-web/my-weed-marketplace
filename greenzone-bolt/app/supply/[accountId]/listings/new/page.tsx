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
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['flower', 'edible', 'vape', 'concentrate', 'topical', 'preroll', 'other'] as const;

type CatalogRow = { id: string; name: string; category: string };

export default function SupplyNewListingPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const router = useRouter();
  const { toast } = useToast();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogProductId, setCatalogProductId] = useState<string>('');
  const [titleOverride, setTitleOverride] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [moq, setMoq] = useState('');
  const [caseSize, setCaseSize] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [visibility, setVisibility] = useState<'draft' | 'live'>('draft');

  const loadAccount = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data: acc } = await supabase
      .from('supply_accounts')
      .select('brand_id')
      .eq('id', accountId)
      .maybeSingle();
    const bid = (acc as { brand_id: string | null } | null)?.brand_id ?? null;
    setBrandId(bid);
    if (bid) {
      const { data: cp } = await supabase
        .from('catalog_products')
        .select('id,name,category')
        .eq('brand_id', bid)
        .order('name');
      setCatalog((cp as CatalogRow[]) ?? []);
    } else {
      setCatalog([]);
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const save = async () => {
    const cpId = catalogProductId.trim() || null;
    const title = titleOverride.trim() || null;
    if (!cpId && !title) {
      toast({ variant: 'destructive', title: 'Title or catalog SKU required' });
      return;
    }
    const listCents =
      listPrice.trim() === '' ? null : Math.round(parseFloat(listPrice) * 100);
    const moqN = moq.trim() === '' ? null : parseInt(moq, 10);
    setSaving(true);
    const { error } = await supabase.from('b2b_listings').insert({
      supply_account_id: accountId,
      catalog_product_id: cpId,
      title_override: title,
      description: description.trim() || null,
      category,
      moq: moqN != null && Number.isFinite(moqN) ? moqN : null,
      case_size: caseSize.trim() || null,
      list_price_cents: listCents != null && Number.isFinite(listCents) ? listCents : null,
      visibility,
    });
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
      return;
    }
    toast({ title: 'Product created' });
    router.push(`/supply/${accountId}/listings`);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-400">
        <Link href={`/supply/${accountId}/listings`} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
      <h1 className="text-xl font-bold text-white">New product</h1>
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      ) : (
        <Card className="space-y-4 border-zinc-800 bg-zinc-900 p-4">
          {brandId && catalog.length > 0 ? (
            <div>
              <Label className="text-zinc-400">Catalog product (optional)</Label>
              <Select value={catalogProductId || '__none__'} onValueChange={(v) => setCatalogProductId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="mt-1 border-zinc-700 bg-background text-foreground">
                  <SelectValue placeholder="Pick master SKU" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None — manual title</SelectItem>
                  {catalog.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div>
            <Label className="text-zinc-400">Title (when no catalog SKU)</Label>
            <Input
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              className="mt-1 border-zinc-700 bg-background text-foreground"
              placeholder="e.g. Case of 24 · Blue Dream 3.5g"
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
              <Input
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="mt-1 border-zinc-700 bg-background text-foreground"
              />
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
            <Input
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              className="mt-1 border-zinc-700 bg-background text-foreground"
              placeholder="Leave blank for &quot;contact for pricing&quot;"
            />
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
          <Button type="button" disabled={saving} onClick={() => void save()} className="w-full bg-green-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </Card>
      )}
    </div>
  );
}
