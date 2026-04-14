'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { normalizeListingMarketSlugs } from '@/lib/usStateCodes';

type CaMarket = { slug: string; name: string; subtitle: string | null };

export default function SupplyServiceAreasPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const { toast } = useToast();
  const [markets, setMarkets] = useState<CaMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const loadMarkets = useCallback(async () => {
    const { data, error } = await supabase
      .from('listing_markets')
      .select('slug,name,subtitle')
      .eq('region_key', 'ca')
      .order('sort_order', { ascending: true });
    if (error) {
      toast({ variant: 'destructive', title: error.message });
      setMarkets([]);
    } else {
      setMarkets((data as CaMarket[]) ?? []);
    }
  }, [toast]);

  const loadAccount = useCallback(async () => {
    if (!accountId) return;
    const { data, error } = await supabase
      .from('supply_accounts')
      .select('service_listing_market_slugs,service_notes')
      .eq('id', accountId)
      .maybeSingle();
    if (error || !data) {
      toast({ variant: 'destructive', title: error?.message || 'Could not load account' });
      return;
    }
    const row = data as { service_listing_market_slugs: string[] | null; service_notes: string | null };
    setSelected(new Set(normalizeListingMarketSlugs(row.service_listing_market_slugs ?? [])));
    setNotes(row.service_notes ?? '');
  }, [accountId, toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadMarkets();
      if (!cancelled) await loadAccount();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMarkets, loadAccount]);

  const toggle = (slug: string) => {
    const key = slug.toLowerCase();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!accountId) return;
    setSaving(true);
    const slugs = normalizeListingMarketSlugs(Array.from(selected));
    const { error } = await supabase.rpc('supply_account_set_service_listing_markets', {
      p_supply_account_id: accountId,
      p_market_slugs: slugs,
      p_notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) toast({ variant: 'destructive', title: error.message });
    else toast({ title: 'Service areas saved' });
  };

  if (!accountId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Service areas</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Choose the same California listing regions shoppers see on the map (from{' '}
          <code className="text-zinc-500">listing_markets</code> where <code className="text-zinc-500">region_key = ca</code>
          ). Retail vendors see overlap with their <strong className="text-zinc-300">approved operating areas</strong>.
          Leave none selected for &quot;coverage not set&quot; (neutral).
        </p>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      ) : (
        <>
          <Card className="space-y-4 border-zinc-800 bg-zinc-900/80 p-6">
            <Label className="text-zinc-200">California listing regions</Label>
            <div className="grid max-h-[min(60vh,28rem)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {markets.map((m) => {
                const key = m.slug.toLowerCase();
                return (
                  <label
                    key={m.slug}
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm hover:border-zinc-600"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(m.slug)}
                      className="mt-1 rounded border-zinc-600"
                    />
                    <span>
                      <span className="font-medium text-zinc-100">{m.name}</span>
                      <span className="ml-2 font-mono text-xs text-sky-400/90">{m.slug}</span>
                      {m.subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{m.subtitle}</p> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
          <Card className="space-y-2 border-zinc-800 bg-zinc-900/80 p-6">
            <Label htmlFor="svc-notes" className="text-zinc-200">
              Notes (optional)
            </Label>
            <Textarea
              id="svc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Direct only in OC; broker elsewhere"
              className="min-h-[88px] border-zinc-700 bg-zinc-950 text-white"
            />
          </Card>
          <Button type="button" disabled={saving} onClick={() => void save()} className="bg-green-700 hover:bg-green-600">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save service areas'}
          </Button>
        </>
      )}
    </div>
  );
}
