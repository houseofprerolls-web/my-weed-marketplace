'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';

type RfqRow = {
  id: string;
  status: string;
  created_at: string;
  buyer_note: string | null;
  supply_accounts: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

const statusTone: Record<string, string> = {
  submitted: 'bg-blue-900/50 text-blue-200',
  in_review: 'bg-amber-900/50 text-amber-200',
  quoted: 'bg-violet-900/50 text-violet-200',
  closed: 'bg-zinc-800 text-zinc-400',
  cancelled: 'bg-red-950/50 text-red-300',
};

export default function VendorSupplyRfqsHistoryPage() {
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { vendor, loading: vLoading } = useVendorBusiness({ adminMenuVendorId });
  const [rows, setRows] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vendor?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('b2b_rfq_requests')
      .select('id,status,created_at,buyer_note,supply_accounts(name,slug)')
      .eq('buyer_vendor_id', vendor.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setRows([]);
    } else setRows((data as RfqRow[]) ?? []);
    setLoading(false);
  }, [vendor?.id]);

  useEffect(() => {
    if (!vLoading) void load();
  }, [vLoading, load]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-400 hover:text-white">
        <Link href={q('/vendor/supply/directory')} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Browse suppliers
        </Link>
      </Button>
      <h1 className="text-2xl font-bold text-white">My RFQs</h1>
      {vLoading || loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      ) : !vendor ? (
        <Card className="border-sky-900/30 bg-zinc-900/50 p-6 text-zinc-400">No vendor context.</Card>
      ) : rows.length === 0 ? (
        <Card className="border-sky-900/30 bg-zinc-900/50 p-8 text-center text-zinc-400">
          No RFQs yet. Submit one from a supplier page.
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="border-sky-900/30 bg-zinc-900/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-white">
                    {(Array.isArray(r.supply_accounts) ? r.supply_accounts[0]?.name : r.supply_accounts?.name) ??
                      'Supplier'}
                  </span>
                  <Badge className={statusTone[r.status] ?? 'bg-zinc-800 text-zinc-300'}>{r.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</p>
                {r.buyer_note ? (
                  <p className="mt-2 text-sm text-zinc-400 line-clamp-3">{r.buyer_note}</p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
