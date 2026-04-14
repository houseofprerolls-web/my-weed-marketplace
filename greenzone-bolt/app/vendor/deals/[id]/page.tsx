'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRole } from '@/hooks/useRole';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { laHmFromIso, laYmdFromIso, rpcDealLaScheduleBounds } from '@/lib/dealLaCalendarBounds';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { US_STATE_OPTIONS } from '@/lib/usStates';
import { formatDealListingMarketsLabel, formatDealRegionLabel } from '@/lib/dealRegions';
import { fetchVendorAllowedDealRegions, fetchVendorApprovedListingMarkets } from '@/lib/vendorDealRegions';
import type { DealKind } from '@/lib/vendorMenuProductPricing';
import { DealHeroImageField } from '@/components/vendor/DealHeroImageField';

type ProductRow = { id: string; name: string };

const DEAL_KINDS: DealKind[] = [
  'percent_off',
  'fixed_amount_off',
  'set_price',
  'bogo',
  'bundle',
  'min_spend',
  'custom',
];

function coerceKind(v: unknown): DealKind {
  return typeof v === 'string' && (DEAL_KINDS as readonly string[]).includes(v) ? (v as DealKind) : 'percent_off';
}

export default function VendorEditDealPage() {
  const router = useRouter();
  const params = useParams();
  const dealId = typeof params?.id === 'string' ? params.id : '';
  const { toast } = useToast();
  const { loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const { isAdmin } = useRole();
  const showTimeScheduling = Boolean(isAdmin || vendor?.deal_datetime_scheduling_enabled === true);
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [allowedRegions, setAllowedRegions] = useState<string[]>([]);
  const [approvedListingMarkets, setApprovedListingMarkets] = useState<
    { slug: string; name: string; region_key: string | null }[]
  >([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDeal, setLoadingDeal] = useState(true);
  const [formReady, setFormReady] = useState(false);
  const [dealRow, setDealRow] = useState<Record<string, unknown> | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dealKind, setDealKind] = useState<DealKind>('percent_off');
  const [discountPercent, setDiscountPercent] = useState('15');
  const [fixedOffDollars, setFixedOffDollars] = useState('5');
  const [setPriceDollars, setSetPriceDollars] = useState('25');
  const [minSpendDollars, setMinSpendDollars] = useState('50');
  const [customHeadline, setCustomHeadline] = useState('');
  const [customRules, setCustomRules] = useState('');
  const [allDays, setAllDays] = useState(true);
  const [activeDays, setActiveDays] = useState<Set<number>>(() => new Set([0, 1, 2, 3, 4, 5, 6]));
  const [dailyStart, setDailyStart] = useState(''); // HH:MM
  const [dailyEnd, setDailyEnd] = useState(''); // HH:MM
  const [startDateYmd, setStartDateYmd] = useState('');
  const [endDateYmd, setEndDateYmd] = useState('');
  const [startTimeHm, setStartTimeHm] = useState('');
  const [endTimeHm, setEndTimeHm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [allActiveStates, setAllActiveStates] = useState(true);
  const [dealRegionCodes, setDealRegionCodes] = useState<Set<string>>(new Set());
  const [allListingMarkets, setAllListingMarkets] = useState(true);
  const [dealMarketSlugs, setDealMarketSlugs] = useState<Set<string>>(() => new Set());

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vendor?.id) {
        setAllowedRegions([]);
        setApprovedListingMarkets([]);
        setLoadingRegions(false);
        return;
      }
      setLoadingRegions(true);
      const [keys, markets] = await Promise.all([
        fetchVendorAllowedDealRegions(supabase, vendor.id),
        fetchVendorApprovedListingMarkets(supabase, vendor.id),
      ]);
      if (!cancelled) {
        setAllowedRegions(keys);
        setApprovedListingMarkets(markets);
        setLoadingRegions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendor?.id]);

  useEffect(() => {
    setFormReady(false);
    setDealRow(null);
  }, [dealId, vendor?.id]);

  useEffect(() => {
    if (!vendor?.id || !dealId || loadingRegions) return;

    let cancelled = false;
    (async () => {
      setLoadingDeal(true);
      setFormReady(false);
      const { data: row, error } = await supabase.from('deals').select('*').eq('id', dealId).eq('vendor_id', vendor.id).maybeSingle();

      if (cancelled) return;

      if (error || !row) {
        setLoadingDeal(false);
        toast({
          title: 'Deal not found',
          description: error?.message ?? 'You may not have access to this deal.',
          variant: 'destructive',
        });
        router.replace(withAdminVendorQuery('/vendor/deals', adminMenuVendorId));
        return;
      }

      setDealRow(row as Record<string, unknown>);
      setLoadingDeal(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [vendor?.id, dealId, loadingRegions, adminMenuVendorId, toast, router]);

  useEffect(() => {
    if (!dealRow || loadingRegions) return;

    const row = dealRow;
    const o =
      row.deal_options && typeof row.deal_options === 'object'
        ? (row.deal_options as Record<string, unknown>)
        : {};

    setTitle(String(row.title ?? ''));
    setDescription(String(row.description ?? ''));
    setDealKind(coerceKind(o.deal_kind));
    setDiscountPercent(String(Number(row.discount_percent ?? 0)));

    const fc = Number(o.fixed_off_cents);
    setFixedOffDollars(Number.isFinite(fc) && fc > 0 ? (fc / 100).toFixed(2) : '5');
    const sp = Number(o.set_price_cents);
    setSetPriceDollars(Number.isFinite(sp) && sp > 0 ? (sp / 100).toFixed(2) : '25');
    const ms = Number(o.min_spend_cents);
    setMinSpendDollars(Number.isFinite(ms) && ms > 0 ? (ms / 100).toFixed(2) : '50');
    setCustomHeadline(typeof o.custom_headline === 'string' ? o.custom_headline : '');
    setCustomRules(typeof o.custom_rules === 'string' ? o.custom_rules : '');

    setBadgeLabel(typeof o.badge_label === 'string' ? o.badge_label : '');
    setUrgencyLine(typeof o.urgency_line === 'string' ? o.urgency_line : '');
    setAccent(typeof o.accent === 'string' ? String(o.accent) : 'lime');
    setPromoCode(typeof o.promo_code === 'string' ? o.promo_code : '');
    setTerms(typeof o.terms_fine_print === 'string' ? o.terms_fine_print : '');
    setHeroImageUrl(
      typeof row.image_url === 'string' && row.image_url.trim().length > 0
        ? row.image_url
        : typeof o.hero_image_url === 'string'
          ? o.hero_image_url
          : ''
    );
    setStackable(o.stackable === true);
    setBogo(o.bogo === true);
    setSpotlight(o.spotlight === true);

    const lmRow = Array.isArray((row as { listing_market_slugs?: unknown }).listing_market_slugs)
      ? ((row as { listing_market_slugs: unknown[] }).listing_market_slugs as unknown[])
          .map((x) => String(x).trim())
          .filter(Boolean)
      : [];

    if (approvedListingMarkets.length > 0) {
      const allowSlugs = approvedListingMarkets.map((m) => m.slug);
      const coversAll =
        allowSlugs.length > 0 &&
        lmRow.length === allowSlugs.length &&
        allowSlugs.every((s) => lmRow.includes(s));
      if (coversAll || lmRow.length === 0) {
        setAllListingMarkets(true);
        setDealMarketSlugs(new Set());
      } else {
        setAllListingMarkets(false);
        setDealMarketSlugs(new Set(lmRow.filter((s) => allowSlugs.includes(s))));
      }
    } else {
      const rk = Array.isArray(row.region_keys)
        ? (row.region_keys as unknown[]).map((x) => String(x).toUpperCase().trim().slice(0, 2))
        : [];
      const allow = allowedRegions;
      const isFull = allow.length > 0 && rk.length === allow.length && allow.every((c) => rk.includes(c));
      if (isFull || rk.length === 0) {
        setAllActiveStates(true);
        setDealRegionCodes(new Set());
      } else {
        setAllActiveStates(false);
        setDealRegionCodes(new Set(rk));
      }
    }

    const pid = Array.isArray(row.products) ? (row.products as unknown[]).map((x) => String(x)) : [];
    setSelectedProductIds(new Set(pid));

    const startIso = row.starts_at
      ? String(row.starts_at)
      : `${String(row.start_date ?? '')}T12:00:00`;
    const endIso = row.ends_at ? String(row.ends_at) : `${String(row.end_date ?? '')}T12:00:00`;
    setStartDateYmd(laYmdFromIso(startIso));
    setEndDateYmd(laYmdFromIso(endIso));
    setStartTimeHm(laHmFromIso(startIso));
    setEndTimeHm(laHmFromIso(endIso));

    const rawDays = Array.isArray(row.active_days) ? (row.active_days as unknown[]) : [];
    const parsedDays = rawDays
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6) as number[];
    if (parsedDays.length === 0) {
      setAllDays(true);
      setActiveDays(new Set([0, 1, 2, 3, 4, 5, 6]));
    } else {
      setAllDays(false);
      setActiveDays(new Set(parsedDays));
    }
    const st = typeof row.daily_start_time === 'string' ? row.daily_start_time : '';
    const en = typeof row.daily_end_time === 'string' ? row.daily_end_time : '';
    setDailyStart(st ? st.slice(0, 5) : '');
    setDailyEnd(en ? en.slice(0, 5) : '');

    setFormReady(true);
  }, [dealRow, loadingRegions, allowedRegions.join(','), approvedListingMarkets.map((m) => m.slug).join('|')]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor?.id || !dealId) return;

    if (!startDateYmd || !endDateYmd) {
      toast({ title: 'Schedule required', description: 'Pick start and end dates.', variant: 'destructive' });
      return;
    }
    if (startDateYmd > endDateYmd) {
      toast({
        title: 'Invalid schedule',
        description: 'End date must be on or after start date.',
        variant: 'destructive',
      });
      return;
    }

    const bounds = await rpcDealLaScheduleBounds(supabase, startDateYmd, endDateYmd, {
      useClockTimes: showTimeScheduling,
      startTimeHm,
      endTimeHm,
    });
    if (!bounds) {
      toast({
        title: 'Could not build schedule',
        description: 'Try again or contact support if this persists.',
        variant: 'destructive',
      });
      return;
    }
    if (new Date(bounds.ends_at).getTime() <= new Date(bounds.starts_at).getTime()) {
      toast({
        title: 'Invalid schedule',
        description: 'End must be after start — adjust dates or clock times.',
        variant: 'destructive',
      });
      return;
    }
    const starts_at = bounds.starts_at;
    const ends_at = bounds.ends_at;

    let pct = 0;
    if (dealKind === 'percent_off' || dealKind === 'bundle') {
      pct = Math.min(100, Math.max(0, parseInt(discountPercent, 10) || 0));
    } else if (dealKind === 'bogo') {
      pct = Math.min(100, Math.max(0, parseInt(discountPercent, 10) || 0));
    }

    const parseMoneyToCents = (raw: string): number | null => {
      const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(n) || n < 0) return null;
      return Math.round(n * 100);
    };

    const fixedCents = dealKind === 'fixed_amount_off' ? parseMoneyToCents(fixedOffDollars) : null;
    const setPriceCents = dealKind === 'set_price' ? parseMoneyToCents(setPriceDollars) : null;
    const minSpendCents = dealKind === 'min_spend' ? parseMoneyToCents(minSpendDollars) : null;

    if (dealKind === 'fixed_amount_off' && (fixedCents == null || fixedCents <= 0)) {
      toast({ title: 'Amount required', description: 'Enter a valid dollars-off amount.', variant: 'destructive' });
      return;
    }
    if (dealKind === 'set_price' && (setPriceCents == null || setPriceCents <= 0)) {
      toast({ title: 'Price required', description: 'Enter a valid promotional price.', variant: 'destructive' });
      return;
    }
    if (dealKind === 'min_spend' && (minSpendCents == null || minSpendCents <= 0)) {
      toast({ title: 'Minimum required', description: 'Enter a valid minimum spend.', variant: 'destructive' });
      return;
    }
    if (dealKind === 'custom' && !customHeadline.trim()) {
      toast({ title: 'Headline required', description: 'Add a short headline for this custom offer.', variant: 'destructive' });
      return;
    }

    const deal_options: Record<string, unknown> = {
      deal_kind: dealKind,
      badge_label: badgeLabel.trim() || undefined,
      urgency_line: urgencyLine.trim() || undefined,
      accent,
      promo_code: promoCode.trim() || undefined,
      terms_fine_print: terms.trim() || undefined,
      hero_image_url: heroImageUrl.trim() || undefined,
      stackable,
      bogo: dealKind === 'bogo' ? true : bogo,
      spotlight,
      custom_headline: dealKind === 'custom' ? customHeadline.trim() || undefined : undefined,
      custom_rules: dealKind === 'custom' ? customRules.trim() || undefined : undefined,
      fixed_off_cents: fixedCents != null && fixedCents > 0 ? fixedCents : undefined,
      set_price_cents: setPriceCents != null && setPriceCents > 0 ? setPriceCents : undefined,
      min_spend_cents: minSpendCents != null && minSpendCents > 0 ? minSpendCents : undefined,
    };

    let region_keys: string[] = [];
    let listing_market_slugs: string[] | undefined;

    if (approvedListingMarkets.length > 0) {
      listing_market_slugs = allListingMarkets
        ? []
        : Array.from(dealMarketSlugs).map((s) => s.trim()).filter(Boolean);
      if (!allListingMarkets) {
        if (listing_market_slugs.length === 0) {
          toast({
            title: 'Pick listing areas',
            description: 'Choose at least one approved area, or use “All my approved listing areas”.',
            variant: 'destructive',
          });
          return;
        }
        const allowedSlugSet = new Set(approvedListingMarkets.map((m) => m.slug));
        for (const s of listing_market_slugs) {
          if (!allowedSlugSet.has(s)) {
            toast({ title: 'Invalid area', description: `${s} is not approved for your store.`, variant: 'destructive' });
            return;
          }
        }
      }
    } else {
      region_keys = allActiveStates
        ? []
        : Array.from(dealRegionCodes)
            .map((c) => c.toUpperCase().trim())
            .filter(Boolean);

      if (!allActiveStates) {
        if (region_keys.length === 0) {
          toast({
            title: 'Pick regions',
            description: 'Choose at least one allowed state, or use “All my active states”.',
            variant: 'destructive',
          });
          return;
        }
        for (const rk of region_keys) {
          if (allowedRegions.length > 0 && !allowedRegions.includes(rk)) {
            toast({
              title: 'Invalid region',
              description: `${rk} is not in your active markets.`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }

    setSaving(true);
    const active_days = allDays ? null : Array.from(activeDays).sort((a, b) => a - b);
    const daily_start_time = showTimeScheduling && dailyStart.trim() ? dailyStart.trim() : null;
    const daily_end_time = showTimeScheduling && dailyEnd.trim() ? dailyEnd.trim() : null;

    const updatePayload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      image_url: heroImageUrl.trim() || null,
      discount_percent: pct,
      products: Array.from(selectedProductIds),
      deal_options,
      region_keys,
      starts_at,
      ends_at,
      active_days,
      daily_start_time,
      daily_end_time,
    };
    if (approvedListingMarkets.length > 0) {
      updatePayload.listing_market_slugs = listing_market_slugs;
    }

    const { error } = await supabase.from('deals').update(updatePayload).eq('id', dealId).eq('vendor_id', vendor.id);

    setSaving(false);

    if (error) {
      toast({
        title: 'Could not save deal',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Deal updated' });
    router.push(vLink('/vendor/deals'));
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDay(d: number) {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function toggleRegion(code: string) {
    if (!allowedRegions.includes(code)) return;
    setDealRegionCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleMarketSlug(slug: string) {
    if (!approvedListingMarkets.some((m) => m.slug === slug)) return;
    setDealMarketSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const allowedStateOptions = US_STATE_OPTIONS.filter((s) => allowedRegions.includes(s.code));
  const marketNameBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of approvedListingMarkets) m.set(x.slug, x.name);
    return m;
  }, [approvedListingMarkets]);
  const regionSummary =
    approvedListingMarkets.length > 0
      ? allListingMarkets
        ? formatDealListingMarketsLabel(
            approvedListingMarkets.map((x) => x.slug),
            marketNameBySlug
          )
        : formatDealListingMarketsLabel(Array.from(dealMarketSlugs), marketNameBySlug)
      : allActiveStates
        ? formatDealRegionLabel(allowedRegions)
        : formatDealRegionLabel(Array.from(dealRegionCodes));

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!mayEnterVendorShell || !vendorsMode || !vendor) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">Editing deals requires a linked store and vendors schema.</p>
      </div>
    );
  }

  if (!dealId) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">Missing deal id.</p>
      </div>
    );
  }

  if (loadingDeal || loadingRegions || !formReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href={vLink('/vendor/deals')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to deals
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edit deal</h1>
          <p className="mt-2 text-gray-400">
            Start and end dates use the Pacific calendar for everyone. Optional clock times and daily windows appear when
            advanced scheduling is enabled for your store.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>

          <div className="min-w-0 md:col-span-3">
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
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Deal type</Label>
                    <Select value={dealKind} onValueChange={(v) => setDealKind(v as DealKind)}>
                      <SelectTrigger className="mt-1 border-green-900/30 bg-gray-950 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent_off">Percent off menu price</SelectItem>
                        <SelectItem value="fixed_amount_off">Fixed dollars off</SelectItem>
                        <SelectItem value="set_price">Set promotional price</SelectItem>
                        <SelectItem value="bogo">BOGO (second unit discount)</SelectItem>
                        <SelectItem value="bundle">Bundle / multi-buy (% off)</SelectItem>
                        <SelectItem value="min_spend">Minimum spend (informational)</SelectItem>
                        <SelectItem value="custom">Custom headline &amp; rules</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(dealKind === 'percent_off' || dealKind === 'bundle' || dealKind === 'bogo') && (
                    <div>
                      <Label htmlFor="discount" className="text-gray-300">
                        {dealKind === 'bogo' ? 'Discount % on qualifying units (0 = default 50% off 2nd)' : 'Discount %'}
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
                  )}

                  {dealKind === 'fixed_amount_off' && (
                    <div>
                      <Label htmlFor="fixedoff" className="text-gray-300">
                        Dollars off
                      </Label>
                      <Input
                        id="fixedoff"
                        type="text"
                        inputMode="decimal"
                        value={fixedOffDollars}
                        onChange={(e) => setFixedOffDollars(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                  )}

                  {dealKind === 'set_price' && (
                    <div>
                      <Label htmlFor="setprice" className="text-gray-300">
                        Promotional price (USD)
                      </Label>
                      <Input
                        id="setprice"
                        type="text"
                        inputMode="decimal"
                        value={setPriceDollars}
                        onChange={(e) => setSetPriceDollars(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                  )}

                  {dealKind === 'min_spend' && (
                    <div>
                      <Label htmlFor="minspend" className="text-gray-300">
                        Minimum spend (USD)
                      </Label>
                      <Input
                        id="minspend"
                        type="text"
                        inputMode="decimal"
                        value={minSpendDollars}
                        onChange={(e) => setMinSpendDollars(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                  )}

                  {dealKind === 'custom' && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="customhead" className="text-gray-300">
                          Headline
                        </Label>
                        <Input
                          id="customhead"
                          value={customHeadline}
                          onChange={(e) => setCustomHeadline(e.target.value)}
                          className="mt-1 border-green-900/30 bg-gray-950 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customrules" className="text-gray-300">
                          Rules
                        </Label>
                        <Textarea
                          id="customrules"
                          value={customRules}
                          onChange={(e) => setCustomRules(e.target.value)}
                          rows={3}
                          className="mt-1 border-green-900/30 bg-gray-950 text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="startdate" className="text-gray-300">
                        Start date (Pacific calendar)
                      </Label>
                      <Input
                        id="startdate"
                        type="date"
                        required
                        value={startDateYmd}
                        onChange={(e) => setStartDateYmd(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="enddate" className="text-gray-300">
                        End date (inclusive)
                      </Label>
                      <Input
                        id="enddate"
                        type="date"
                        required
                        value={endDateYmd}
                        onChange={(e) => setEndDateYmd(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                  </div>

                  {showTimeScheduling ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="startclock" className="text-gray-300">
                          Start time (optional)
                        </Label>
                        <Input
                          id="startclock"
                          type="time"
                          value={startTimeHm}
                          onChange={(e) => setStartTimeHm(e.target.value)}
                          className="mt-1 border-green-900/30 bg-gray-950 text-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">Blank = midnight at start of the first day (Pacific).</p>
                      </div>
                      <div>
                        <Label htmlFor="endclock" className="text-gray-300">
                          End time (optional)
                        </Label>
                        <Input
                          id="endclock"
                          type="time"
                          value={endTimeHm}
                          onChange={(e) => setEndTimeHm(e.target.value)}
                          className="mt-1 border-green-900/30 bg-gray-950 text-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">Blank = last second of the last day (Pacific).</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-lg border border-green-900/20 bg-gray-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">Runs on</p>
                        <p className="text-sm text-gray-500">
                          {showTimeScheduling
                            ? 'Pick specific weekdays, optional daily hours below, or run every day.'
                            : 'Optional: limit which weekdays apply (deal still runs full Pacific days on those dates). Daily hour windows need advanced scheduling.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="alldays"
                          checked={allDays}
                          onCheckedChange={(c) => {
                            const on = c === true;
                            setAllDays(on);
                            if (on) setActiveDays(new Set([0, 1, 2, 3, 4, 5, 6]));
                          }}
                        />
                        <Label htmlFor="alldays" className="cursor-pointer text-gray-200">
                          All days
                        </Label>
                      </div>
                    </div>

                    {!allDays && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                        {[
                          { k: 0, label: 'Sun' },
                          { k: 1, label: 'Mon' },
                          { k: 2, label: 'Tue' },
                          { k: 3, label: 'Wed' },
                          { k: 4, label: 'Thu' },
                          { k: 5, label: 'Fri' },
                          { k: 6, label: 'Sat' },
                        ].map((d) => (
                          <label
                            key={d.k}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-green-900/20 bg-gray-950/30 px-3 py-2 hover:bg-gray-900/60"
                          >
                            <Checkbox checked={activeDays.has(d.k)} onCheckedChange={() => toggleDay(d.k)} />
                            <span className="text-sm text-gray-200">{d.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {showTimeScheduling ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="dstart" className="text-gray-300">
                            Daily start time (optional)
                          </Label>
                          <Input
                            id="dstart"
                            type="time"
                            value={dailyStart}
                            onChange={(e) => setDailyStart(e.target.value)}
                            className="mt-1 border-green-900/30 bg-gray-950 text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500">Leave blank to run all day.</p>
                        </div>
                        <div>
                          <Label htmlFor="dend" className="text-gray-300">
                            Daily end time (optional)
                          </Label>
                          <Input
                            id="dend"
                            type="time"
                            value={dailyEnd}
                            onChange={(e) => setDailyEnd(e.target.value)}
                            className="mt-1 border-green-900/30 bg-gray-950 text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500">End earlier than start = spans midnight.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <h2 className="mb-2 text-xl font-semibold text-white">Listing areas</h2>
                {allowedRegions.length === 0 && approvedListingMarkets.length === 0 ? (
                  <p className="text-amber-200/90">
                    Set vendor state or regional menus, and ensure admin has approved marketplace areas for your store.
                  </p>
                ) : approvedListingMarkets.length > 0 ? (
                  <>
                    <p className="mb-4 text-sm text-gray-500">
                      Only admin-approved listing areas. Scope:{' '}
                      <span className="text-green-400/90">{regionSummary}</span>
                    </p>
                    <div className="mb-4 flex items-center gap-2 rounded-md border border-green-900/30 bg-gray-950/50 p-3">
                      <Checkbox
                        id="alllistmarkets"
                        checked={allListingMarkets}
                        onCheckedChange={(c) => {
                          const on = c === true;
                          setAllListingMarkets(on);
                          if (on) setDealMarketSlugs(new Set());
                        }}
                      />
                      <Label htmlFor="alllistmarkets" className="cursor-pointer text-gray-200">
                        All my approved listing areas ({approvedListingMarkets.length})
                      </Label>
                    </div>
                    {!allListingMarkets && (
                      <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-green-900/20 p-3">
                        {approvedListingMarkets.map((m) => (
                          <label
                            key={m.slug}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-800/50"
                          >
                            <Checkbox
                              checked={dealMarketSlugs.has(m.slug)}
                              onCheckedChange={() => toggleMarketSlug(m.slug)}
                            />
                            <span className="text-sm text-gray-200">{m.name}</span>
                            {m.region_key ? (
                              <span className="text-xs text-gray-500">({String(m.region_key).toUpperCase()})</span>
                            ) : null}
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-sm text-gray-500">
                      Scope: <span className="text-green-400/90">{regionSummary}</span>
                    </p>
                    <div className="mb-4 flex items-center gap-2 rounded-md border border-green-900/30 bg-gray-950/50 p-3">
                      <Checkbox
                        id="allstates"
                        checked={allActiveStates}
                        onCheckedChange={(c) => {
                          const on = c === true;
                          setAllActiveStates(on);
                          if (on) setDealRegionCodes(new Set());
                        }}
                      />
                      <Label htmlFor="allstates" className="cursor-pointer text-gray-200">
                        All my active states ({allowedRegions.join(', ')})
                      </Label>
                    </div>
                    {!allActiveStates && (
                      <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-green-900/20 p-3 sm:columns-2 sm:gap-4">
                        {allowedStateOptions.map(({ code, name }) => (
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
                    )}
                  </>
                )}
              </Card>

              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Creative options</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-gray-300">Badge label</Label>
                    <Input
                      value={badgeLabel}
                      onChange={(e) => setBadgeLabel(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Urgency line</Label>
                    <Input
                      value={urgencyLine}
                      onChange={(e) => setUrgencyLine(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
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
                    <Label className="text-gray-300">Promo code</Label>
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                    />
                  </div>
                  <DealHeroImageField
                    value={heroImageUrl}
                    onChange={setHeroImageUrl}
                    disabled={saving || loadingRegions || loadingDeal}
                  />
                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Terms</Label>
                    <Textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      rows={2}
                      className="mt-1 border-green-900/30 bg-gray-950 text-white"
                    />
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  {dealKind !== 'bogo' && (
                    <div className="flex items-center gap-2">
                      <Checkbox id="bogo" checked={bogo} onCheckedChange={(c) => setBogo(c === true)} />
                      <Label htmlFor="bogo" className="cursor-pointer text-gray-300">
                        BOGO-style (messaging)
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox id="stack" checked={stackable} onCheckedChange={(c) => setStackable(c === true)} />
                    <Label htmlFor="stack" className="cursor-pointer text-gray-300">
                      Stackable
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="spot" checked={spotlight} onCheckedChange={(c) => setSpotlight(c === true)} />
                    <Label htmlFor="spot" className="cursor-pointer text-gray-300">
                      Spotlight hint
                    </Label>
                  </div>
                </div>
              </Card>

              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <h2 className="mb-2 text-xl font-semibold text-white">Menu products (optional)</h2>
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
                <Button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" className="border-gray-600" asChild>
                  <Link href={vLink('/vendor/deals')}>Cancel</Link>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
