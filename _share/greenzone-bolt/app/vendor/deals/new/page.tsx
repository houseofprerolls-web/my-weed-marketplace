'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import VendorNav from '@/components/vendor/VendorNav';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { US_STATE_OPTIONS } from '@/lib/usStates';
import { formatDealRegionLabel } from '@/lib/dealRegions';

type ProductRow = { id: string; name: string };

export default function VendorNewDealPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercent, setDiscountPercent] = useState('15');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [dealRegionCodes, setDealRegionCodes] = useState<Set<string>>(new Set());

  const [badgeLabel, setBadgeLabel] = useState('');
  const [urgencyLine, setUrgencyLine] = useState('');
  const [accent, setAccent] = useState('lime');
  const [promoCode, setPromoCode] = useState('');
  const [terms, setTerms] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [stackable, setStackable] = useState(false);
  const [bogo, setBogo] = useState(false);
  const [spotlight, setSpotlight] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!vendor?.id) {
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);
    const { data, error } = await supabase.from('products').select('id, name').eq('vendor_id', vendor.id).order('name');
    if (error) {
      console.error(error);
      setProducts([]);
    } else {
      setProducts((data || []) as ProductRow[]);
    }
    setLoadingProducts(false);
  }, [vendor?.id]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor?.id) return;

    const pct = Math.min(100, Math.max(0, parseInt(discountPercent, 10) || 0));
    const deal_options = {
      badge_label: badgeLabel.trim() || undefined,
      urgency_line: urgencyLine.trim() || undefined,
      accent,
      promo_code: promoCode.trim() || undefined,
      terms_fine_print: terms.trim() || undefined,
      hero_image_url: heroImageUrl.trim() || undefined,
      stackable,
      bogo,
      spotlight,
    };

    setSaving(true);
    const region_keys = Array.from(dealRegionCodes).map((c) => c.toUpperCase().trim()).filter(Boolean);

    const { error } = await supabase.from('deals').insert({
      vendor_id: vendor.id,
      title: title.trim(),
      description: description.trim() || null,
      discount_percent: pct,
      products: Array.from(selectedProductIds),
      start_date: startDate,
      end_date: endDate,
      deal_options,
      region_keys,
    });
    setSaving(false);

    if (error) {
      toast({
        title: 'Could not create deal',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Deal created', description: 'It will show to shoppers when your store is live and dates are active.' });
    router.push('/vendor/deals');
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRegion(code: string) {
    setDealRegionCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!mayEnterVendorShell || !vendorsMode || !vendor) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">Create deals requires a linked store and vendors schema.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href="/vendor/deals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to deals
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Create a deal</h1>
          <p className="mt-2 text-gray-400">Core fields plus optional creative extras stored on the deal record.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>

          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-8">
              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <h2 className="mb-4 text-xl font-semibold text-white">Basics</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-gray-300">
                      Title
                    </Label>
                    <Input
                      id="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      placeholder="20% off weekend edibles"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-300">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      placeholder="What customers get and any limits"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="discount" className="text-gray-300">
                        Discount %
                      </Label>
                      <Input
                        id="discount"
                        type="number"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="start" className="text-gray-300">
                        Start date
                      </Label>
                      <Input
                        id="start"
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end" className="text-gray-300">
                        End date
                      </Label>
                      <Input
                        id="end"
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <h2 className="mb-2 text-xl font-semibold text-white">Regions</h2>
                <p className="mb-4 text-sm text-gray-500">
                  Leave all unchecked for a <span className="text-gray-300">nationwide</span> deal. Otherwise choose states
                  where this offer runs — it will show on your menu and the sitewide Deals page for shoppers filtering those
                  regions. Current scope:{' '}
                  <span className="text-green-400/90">{formatDealRegionLabel(Array.from(dealRegionCodes))}</span>
                </p>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-green-900/20 p-3 sm:columns-2 sm:gap-4">
                  {US_STATE_OPTIONS.map(({ code, name }) => (
                    <label
                      key={code}
                      className="mb-2 flex cursor-pointer items-center gap-2 break-inside-avoid rounded-md px-2 py-1 hover:bg-gray-800/50"
                    >
                      <Checkbox checked={dealRegionCodes.has(code)} onCheckedChange={() => toggleRegion(code)} />
                      <span className="text-sm text-gray-200">
                        {code} — {name}
                      </span>
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Creative options</h2>
                </div>
                <p className="mb-4 text-sm text-gray-500">
                  These map to <code className="text-green-500/90">deal_options</code> for badges, copy, and display hints.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-gray-300">Badge label</Label>
                    <Input
                      value={badgeLabel}
                      onChange={(e) => setBadgeLabel(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      placeholder="WEEKEND ONLY"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Urgency line</Label>
                    <Input
                      value={urgencyLine}
                      onChange={(e) => setUrgencyLine(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      placeholder="Ends Sunday at midnight"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Accent</Label>
                    <Select value={accent} onValueChange={setAccent}>
                      <SelectTrigger className="mt-1 border-green-900/30 bg-gray-950 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lime">Lime</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Promo code (optional)</Label>
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      placeholder="GREEN20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Hero image URL (optional)</Label>
                    <Input
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Terms / fine print</Label>
                    <Textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      rows={2}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      placeholder="Excludes tax. One per customer."
                    />
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox id="bogo" checked={bogo} onCheckedChange={(c) => setBogo(c === true)} />
                    <Label htmlFor="bogo" className="cursor-pointer text-gray-300">
                      BOGO-style offer
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="stack" checked={stackable} onCheckedChange={(c) => setStackable(c === true)} />
                    <Label htmlFor="stack" className="cursor-pointer text-gray-300">
                      Stackable with other promos
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="spot" checked={spotlight} onCheckedChange={(c) => setSpotlight(c === true)} />
                    <Label htmlFor="spot" className="cursor-pointer text-gray-300">
                      Request spotlight placement (visual hint)
                    </Label>
                  </div>
                </div>
              </Card>

              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <h2 className="mb-2 text-xl font-semibold text-white">Menu products (optional)</h2>
                <p className="mb-4 text-sm text-gray-500">
                  Select SKUs so the deal appears as a tappable chip on your public menu and filters to those items. Leave
                  none for a store-wide headline only (menu chip still shows, but won’t narrow products).
                </p>
                {loadingProducts ? (
                  <Loader2 className="h-6 w-6 animate-spin text-brand-lime" />
                ) : products.length === 0 ? (
                  <p className="text-gray-500">No products on your menu yet.</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-green-900/20 p-3">
                    {products.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-800/50">
                        <Checkbox checked={selectedProductIds.has(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                        <span className="text-sm text-gray-200">{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving || !title.trim()} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish deal'}
                </Button>
                <Button type="button" variant="outline" className="border-gray-600" asChild>
                  <Link href="/vendor/deals">Cancel</Link>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
