'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dealIsActiveNow } from '@/lib/dealSchedule';

type DealAdminRow = {
  id: string;
  title: string;
  marketplace_featured_rank: number | null;
  deal_click_count: number | null;
  start_date: string;
  end_date: string;
  starts_at: string | null;
  ends_at: string | null;
  active_days: number[] | null;
  daily_start_time: string | null;
  daily_end_time: string | null;
  vendors: { name: string; slug: string } | null;
};

export default function AdminMarketplaceDealsPage() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DealAdminRow[]>([]);
  const [draftRanks, setDraftRanks] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deals')
      .select(
        'id, title, marketplace_featured_rank, deal_click_count, start_date, end_date, starts_at, ends_at, active_days, daily_start_time, daily_end_time, vendors!inner(name, slug)'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      toast({ title: 'Could not load deals', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      const list = (data || []) as unknown as DealAdminRow[];
      setRows(list);
      const dr: Record<string, string> = {};
      for (const r of list) {
        dr[r.id] = r.marketplace_featured_rank != null ? String(r.marketplace_featured_rank) : '';
      }
      setDraftRanks(dr);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && isAdmin) void load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, isAdmin, load]);

  async function saveRank(dealId: string) {
    const raw = (draftRanks[dealId] ?? '').trim();
    const rank = raw === '' ? null : parseInt(raw, 10);
    if (raw !== '' && (!Number.isFinite(rank) || rank! < 1 || rank! > 99)) {
      toast({ title: 'Invalid rank', description: 'Use 1–99 or leave blank to clear.', variant: 'destructive' });
      return;
    }
    setSavingId(dealId);
    const { error } = await supabase.rpc('admin_set_deal_marketplace_featured_rank', {
      p_deal_id: dealId,
      p_rank: rank,
    });
    setSavingId(null);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Featured rank updated' });
    void load();
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">Admin only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" className="mb-6 text-gray-400 hover:text-white">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Admin home
          </Link>
        </Button>
        <h1 className="mb-2 text-3xl font-bold">Marketplace deal featuring</h1>
        <p className="mb-8 text-sm text-gray-400">
          Lower featured rank shows earlier on the /deals carousel (1 = first). Leave blank to remove. Remaining carousel
          slots fill by click count automatically.
        </p>

        <div className="space-y-3">
          {rows.map((r) => {
            const live = dealIsActiveNow({
              start_date: r.start_date,
              end_date: r.end_date,
              starts_at: r.starts_at,
              ends_at: r.ends_at,
              active_days: r.active_days,
              daily_start_time: r.daily_start_time,
              daily_end_time: r.daily_end_time,
            });
            const vname = r.vendors?.name ?? '—';
            return (
              <Card key={r.id} className="border-green-900/30 bg-gray-900/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{r.title}</p>
                    <p className="text-sm text-gray-400">{vname}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {live ? 'Live now' : 'Outside schedule'} · {r.deal_click_count ?? 0} clicks
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <Label className="text-xs text-gray-400">Featured rank (1–99)</Label>
                      <Input
                        className="mt-1 w-24 border-green-900/40 bg-gray-950 text-white"
                        value={draftRanks[r.id] ?? ''}
                        onChange={(e) => setDraftRanks((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="—"
                        inputMode="numeric"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={savingId === r.id}
                      onClick={() => saveRank(r.id)}
                    >
                      {savingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {rows.length === 0 && <p className="text-gray-500">No deals found.</p>}
      </div>
    </div>
  );
}
