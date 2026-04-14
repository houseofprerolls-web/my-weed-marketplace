'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, TicketPercent, Trash2 } from 'lucide-react';
import VendorNav from '@/components/vendor/VendorNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';

type PromoRow = {
  id: string;
  code: string;
  label: string | null;
  discount_type: 'percent' | 'fixed_cents';
  discount_percent: number | null;
  discount_cents: number | null;
  min_subtotal_cents: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type RedemptionRow = {
  id: string;
  promo_id: string;
  discount_cents: number;
  created_at: string;
  order_id: string;
};

export default function VendorPromoCodesPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell, refresh } = useVendorBusiness({
    adminMenuVendorId,
  });
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);

  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);

  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [discType, setDiscType] = useState<'percent' | 'fixed_cents'>('percent');
  const [discPct, setDiscPct] = useState('10');
  const [discDollars, setDiscDollars] = useState('5');
  const [minSubDollars, setMinSubDollars] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data: p, error: pe } = await supabase
        .from('vendor_promo_codes')
        .select(
          'id,code,label,discount_type,discount_percent,discount_cents,min_subtotal_cents,max_uses,uses_count,is_active,starts_at,ends_at,created_at'
        )
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      if (pe) throw pe;
      setPromos((p || []) as PromoRow[]);

      const ids = ((p || []) as PromoRow[]).map((r) => r.id);
      if (ids.length === 0) {
        setRedemptions([]);
        return;
      }
      const { data: r, error: re } = await supabase
        .from('vendor_promo_redemptions')
        .select('id,promo_id,discount_cents,created_at,order_id')
        .in('promo_id', ids)
        .order('created_at', { ascending: false })
        .limit(400);
      if (re) throw re;
      setRedemptions((r || []) as RedemptionRow[]);
    } catch (e: unknown) {
      console.error(e);
      setPromos([]);
      setRedemptions([]);
      toast({
        title: 'Could not load promo codes',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [vendor?.id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const statsByPromo = useMemo(() => {
    const m = new Map<string, { uses: number; savedCents: number }>();
    for (const p of promos) {
      m.set(p.id, { uses: 0, savedCents: 0 });
    }
    for (const r of redemptions) {
      const cur = m.get(r.promo_id) ?? { uses: 0, savedCents: 0 };
      cur.uses += 1;
      cur.savedCents += r.discount_cents;
      m.set(r.promo_id, cur);
    }
    return m;
  }, [promos, redemptions]);

  async function createPromo() {
    if (!vendor?.id) return;
    const c = code.trim().toUpperCase();
    if (c.length < 2) {
      toast({ title: 'Code too short', description: 'Use at least 2 characters.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const minC =
        minSubDollars.trim() === '' ? 0 : Math.max(0, Math.round(Number(minSubDollars) * 100) || 0);
      const maxU = maxUses.trim() === '' ? null : Math.max(1, Math.floor(Number(maxUses) || 0));
      if (maxUses.trim() !== '' && (maxU == null || !Number.isFinite(maxU))) {
        toast({ title: 'Max uses', description: 'Enter a positive integer or leave blank.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const payload =
        discType === 'percent'
          ? {
              vendor_id: vendor.id,
              code: c,
              label: label.trim() || null,
              discount_type: 'percent' as const,
              discount_percent: Math.min(100, Math.max(1, Math.round(Number(discPct) || 0))),
              discount_cents: null,
              min_subtotal_cents: minC,
              max_uses: maxU,
              is_active: true,
            }
          : {
              vendor_id: vendor.id,
              code: c,
              label: label.trim() || null,
              discount_type: 'fixed_cents' as const,
              discount_percent: null,
              discount_cents: Math.max(1, Math.round(Number(discDollars) * 100) || 0),
              min_subtotal_cents: minC,
              max_uses: maxU,
              is_active: true,
            };
      if (discType === 'percent' && (!(Number(discPct) >= 1) || !(Number(discPct) <= 100))) {
        toast({ title: 'Percent', description: 'Use 1–100 for percent-off codes.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      if (discType === 'fixed_cents' && (!(Number(discDollars) > 0) || !Number.isFinite(Number(discDollars)))) {
        toast({ title: 'Amount', description: 'Enter a dollar amount greater than zero.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('vendor_promo_codes').insert(payload);
      if (error) throw error;
      toast({ title: 'Promo code created', description: `Customers can enter ${c} at checkout.` });
      setCode('');
      setLabel('');
      await load();
      void refresh();
    } catch (e: unknown) {
      toast({ title: 'Could not create', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, next: boolean) {
    const { error } = await supabase.from('vendor_promo_codes').update({ is_active: next }).eq('id', id);
    if (error) {
      toast({ title: 'Update failed', description: formatSupabaseError(error), variant: 'destructive' });
      return;
    }
    setPromos((rows) => rows.map((r) => (r.id === id ? { ...r, is_active: next } : r)));
  }

  async function removePromo(id: string) {
    if (!window.confirm('Delete this promo code? Redemption history for it will be removed.')) return;
    const { error } = await supabase.from('vendor_promo_codes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: formatSupabaseError(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Promo deleted' });
    await load();
  }

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">You need a linked dispensary to open this page.</p>
      </div>
    );
  }

  if (!vendorsMode || !vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">No dispensary linked.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />
      <div className="min-w-0 flex-1 p-6 md:p-10">
        <Button asChild variant="ghost" className="mb-6 text-gray-400 hover:text-white">
          <Link href={vLink('/vendor/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <TicketPercent className="h-10 w-10 text-amber-400" aria-hidden />
          <div>
            <h1 className="text-3xl font-bold text-white">Promo codes</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Shoppers signed in to DaTreehouse can apply these at cart checkout. Discount is taken from the merchandise
              subtotal before tax. Usage and savings from completed orders appear below each code.
            </p>
          </div>
        </div>

        <Card className="mb-8 border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Create a code</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-gray-400">Code (letters/numbers)</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="mt-1 border-green-900/30 bg-gray-950 font-mono text-white"
                placeholder="SPRING20"
              />
            </div>
            <div>
              <Label className="text-gray-400">Label (optional, internal)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                placeholder="Spring campaign"
              />
            </div>
            <div>
              <Label className="text-gray-400">Discount type</Label>
              <Select value={discType} onValueChange={(v) => setDiscType(v as 'percent' | 'fixed_cents')}>
                <SelectTrigger className="mt-1 border-green-900/30 bg-gray-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                  <SelectItem value="percent">Percent off merchandise</SelectItem>
                  <SelectItem value="fixed_cents">Fixed dollars off merchandise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {discType === 'percent' ? (
              <div>
                <Label className="text-gray-400">Percent off (1–100)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={discPct}
                  onChange={(e) => setDiscPct(e.target.value)}
                  className="mt-1 border-green-900/30 bg-gray-950 text-white"
                />
              </div>
            ) : (
              <div>
                <Label className="text-gray-400">Dollars off (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  value={discDollars}
                  onChange={(e) => setDiscDollars(e.target.value)}
                  className="mt-1 border-green-900/30 bg-gray-950 text-white"
                />
              </div>
            )}
            <div>
              <Label className="text-gray-400">Minimum merchandise subtotal (USD, optional)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={minSubDollars}
                onChange={(e) => setMinSubDollars(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                placeholder="0 = no minimum"
              />
            </div>
            <div>
              <Label className="text-gray-400">Max redemptions (optional)</Label>
              <Input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                placeholder="Unlimited if empty"
              />
            </div>
          </div>
          <Button
            type="button"
            className="mt-6 bg-amber-600 hover:bg-amber-700"
            disabled={saving}
            onClick={() => void createPromo()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create promo code'}
          </Button>
        </Card>

        <h2 className="mb-3 text-lg font-semibold text-white">Your codes & performance</h2>
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
        ) : promos.length === 0 ? (
          <p className="text-sm text-gray-500">No promo codes yet.</p>
        ) : (
          <ul className="space-y-3">
            {promos.map((p) => {
              const st = statsByPromo.get(p.id) ?? { uses: 0, savedCents: 0 };
              const discLabel =
                p.discount_type === 'percent'
                  ? `${p.discount_percent}% off`
                  : `$${((p.discount_cents ?? 0) / 100).toFixed(2)} off`;
              return (
                <li key={p.id}>
                  <Card className="border-green-900/25 bg-gray-950/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-lg font-semibold text-white">{p.code}</p>
                        {p.label ? <p className="text-xs text-gray-500">{p.label}</p> : null}
                        <p className="mt-1 text-sm text-amber-200/90">{discLabel}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          Min merchandise subtotal ${(p.min_subtotal_cents / 100).toFixed(2)} · Redemptions{' '}
                          <span className="text-white">{p.uses_count}</span>
                          {p.max_uses != null ? ` / cap ${p.max_uses}` : ' (no cap)'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Discount value given on completed orders (loaded history):{' '}
                          <span className="text-green-400">${(st.savedCents / 100).toFixed(2)}</span>
                          {st.uses !== p.uses_count ? (
                            <span className="text-gray-600"> · partial load</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`act-${p.id}`}
                            checked={p.is_active}
                            onCheckedChange={(v) => void toggleActive(p.id, v)}
                          />
                          <Label htmlFor={`act-${p.id}`} className="text-xs text-gray-400">
                            Active
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                          aria-label="Delete promo"
                          onClick={() => void removePromo(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
