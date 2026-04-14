'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type RfqRow = { id: string; status: string; created_at: string };

const STATUS_COLORS: Record<string, string> = {
  submitted: '#22c55e',
  in_review: '#38bdf8',
  quoted: '#a78bfa',
  closed: '#71717a',
  cancelled: '#ef4444',
};

export default function SupplyAnalyticsPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [listingStats, setListingStats] = useState({ live: 0, draft: 0, withPromo: 0, accountDeals: 0 });

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data: r } = await supabase
      .from('b2b_rfq_requests')
      .select('id,status,created_at')
      .eq('supplier_supply_account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(500);

    setRfqs((r as RfqRow[]) ?? []);

    const { data: listings } = await supabase
      .from('b2b_listings')
      .select('id,visibility')
      .eq('supply_account_id', accountId);
    const list = listings ?? [];
    const live = list.filter((x) => x.visibility === 'live').length;
    const draft = list.filter((x) => x.visibility === 'draft').length;
    const ids = list.map((x) => x.id);
    let withPromo = 0;
    if (ids.length) {
      const { data: pr } = await supabase.from('b2b_listing_promos').select('listing_id').in('listing_id', ids);
      withPromo = new Set((pr ?? []).map((p) => p.listing_id as string)).size;
    }
    const { data: dealRows } = await supabase.from('b2b_supply_deals').select('id').eq('supply_account_id', accountId);
    const accountDeals = (dealRows ?? []).length;
    setListingStats({ live, draft, withPromo, accountDeals });
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of rfqs) {
      m.set(row.status, (m.get(row.status) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([status, count]) => ({ status, count }));
  }, [rfqs]);

  const rfqByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of rfqs) {
      const d = row.created_at.slice(0, 10);
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    const arr = Array.from(m.entries()).map(([day, count]) => ({ day, count }));
    arr.sort((a, b) => a.day.localeCompare(b.day));
    return arr.slice(-45);
  }, [rfqs]);

  if (!accountId) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">RFQ volume and product mix (from data already on the platform).</p>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs uppercase text-zinc-500">Live products</p>
              <p className="mt-1 text-2xl font-semibold text-white">{listingStats.live}</p>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs uppercase text-zinc-500">Draft products</p>
              <p className="mt-1 text-2xl font-semibold text-white">{listingStats.draft}</p>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs uppercase text-zinc-500">Account deals</p>
              <p className="mt-1 text-2xl font-semibold text-white">{listingStats.accountDeals}</p>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs uppercase text-zinc-500">Products with listing promo</p>
              <p className="mt-1 text-2xl font-semibold text-white">{listingStats.withPromo}</p>
            </Card>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/80 p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">RFQs by status</h2>
            {statusCounts.length === 0 ? (
              <p className="text-sm text-zinc-500">No RFQs yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusCounts}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${String(name)}: ${String(value)}`}
                    >
                      {statusCounts.map((e) => (
                        <Cell key={e.status} fill={STATUS_COLORS[e.status] ?? '#52525b'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/80 p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">RFQs over time (last 45 days with activity)</h2>
            {rfqByDay.length === 0 ? (
              <p className="text-sm text-zinc-500">No RFQ dates to chart.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rfqByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="day" tick={{ fill: '#a1a1aa', fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
                    <Bar dataKey="count" fill="#22c55e" name="RFQs" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
