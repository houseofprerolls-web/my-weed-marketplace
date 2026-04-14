'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type RfqRow = {
  id: string;
  status: string;
  buyer_note: string | null;
  supplier_note: string | null;
  created_at: string;
  vendors: { name: string } | { name: string }[] | null;
  b2b_rfq_line_items: { title_snapshot: string; qty: number; unit: string }[] | null;
};

const STATUSES = ['submitted', 'in_review', 'quoted', 'closed', 'cancelled'] as const;

export default function SupplyRfqsInboxPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const { toast } = useToast();
  const [rows, setRows] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('b2b_rfq_requests')
      .select(
        'id,status,buyer_note,supplier_note,created_at,vendors(name),b2b_rfq_line_items(title_snapshot,qty,unit)'
      )
      .eq('supplier_supply_account_id', accountId)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    const list = (data as RfqRow[]) ?? [];
    setRows(list);
    const n: Record<string, string> = {};
    for (const r of list) {
      n[r.id] = r.supplier_note ?? '';
    }
    setNotes(n);
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('b2b_rfq_requests').update({ status }).eq('id', id);
    if (error) toast({ variant: 'destructive', title: error.message });
    else {
      toast({ title: 'Status updated' });
      void load();
    }
  };

  const saveSupplierNote = async (id: string) => {
    const { error } = await supabase
      .from('b2b_rfq_requests')
      .update({ supplier_note: notes[id]?.trim() || null })
      .eq('id', id);
    if (error) toast({ variant: 'destructive', title: error.message });
    else toast({ title: 'Note saved' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">RFQ inbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          <span className="font-medium text-zinc-300">RFQ</span> means{' '}
          <span className="text-zinc-200">Request for Quote</span>: a licensed retail buyer submits a wholesale quote request
          to your supply account (often with line items and notes). It is not a binding order until you both agree on terms.
        </p>
      </div>
      {rows.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">No RFQs yet.</Card>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="space-y-3 border-zinc-800 bg-zinc-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">
                      {(Array.isArray(r.vendors) ? r.vendors[0]?.name : r.vendors?.name) ?? 'Vendor'}
                    </p>
                    <p className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                    {r.status}
                  </Badge>
                </div>
                {r.buyer_note ? <p className="text-sm text-zinc-300">{r.buyer_note}</p> : null}
                <ul className="list-inside list-disc text-sm text-zinc-400">
                  {(r.b2b_rfq_line_items ?? []).map((li, i) => (
                    <li key={i}>
                      {li.title_snapshot} × {li.qty} {li.unit}
                    </li>
                  ))}
                </ul>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-zinc-400">Status</Label>
                    <Select value={r.status} onValueChange={(v) => void updateStatus(r.id, v)}>
                      <SelectTrigger className="mt-1 border-zinc-700 bg-background text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-400">Internal supplier note</Label>
                  <Textarea
                    value={notes[r.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    className="mt-1 border-zinc-700 bg-background text-foreground"
                    rows={2}
                  />
                  <button
                    type="button"
                    className="mt-2 text-xs text-green-400 hover:underline"
                    onClick={() => void saveSupplierNote(r.id)}
                  >
                    Save note
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
