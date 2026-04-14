'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeList(rows: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of rows) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

type Props = {
  vendorId: string;
  initialEmails: string[] | null | undefined;
  onSaved?: () => void;
};

export function VendorOrderNotificationEmailsCard({ vendorId, initialEmails, onSaved }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const seed = initialEmails?.length ? initialEmails.map((e) => String(e).trim()) : [''];
    setRows(seed.length ? seed : ['']);
  }, [vendorId, initialEmails]);

  const canSave = useMemo(() => {
    const normalized = normalizeList(rows);
    if (normalized.length === 0) return false;
    return normalized.every((e) => EMAIL_RE.test(e));
  }, [rows]);

  const addRow = useCallback(() => {
    setRows((r) => [...r, '']);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows((r) => (r.length <= 1 ? [''] : r.filter((_, i) => i !== idx)));
  }, []);

  const save = useCallback(async () => {
    const normalized = normalizeList(rows);
    if (normalized.length === 0) {
      toast({
        title: 'Add at least one email',
        description: 'We only send automatic new-order emails to addresses you list here.',
        variant: 'destructive',
      });
      return;
    }
    const bad = normalized.find((e) => !EMAIL_RE.test(e));
    if (bad) {
      toast({
        title: 'Invalid email',
        description: `Fix or remove: ${bad}`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ order_notification_emails: normalized })
        .eq('id', vendorId);
      if (error) throw error;
      toast({
        title: 'Saved',
        description: 'Order alert emails updated.',
      });
      onSaved?.();
    } catch (e: unknown) {
      toast({
        title: 'Could not save',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [rows, vendorId, toast, onSaved]);

  return (
    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-5">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="font-medium text-white">Order alert emails</h3>
            <p className="mt-1 text-sm text-gray-400">
              When a customer places an order, we email <span className="text-gray-200">every address</span> you list
              below. Add at least one valid address — we do not send to anyone else automatically.
            </p>
          </div>

          <div className="space-y-2">
            {rows.map((val, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={val}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((r) => r.map((x, i) => (i === idx ? v : x)));
                  }}
                  placeholder="you@shop.com"
                  className="border-green-900/30 bg-black/40 text-white placeholder:text-gray-600"
                  autoComplete="email"
                  inputMode="email"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0 border-red-900/40 text-red-300 hover:bg-red-950/40"
                  aria-label="Remove email row"
                  onClick={() => removeRow(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-green-800/50 text-green-200 hover:bg-green-950/30"
              onClick={addRow}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add address
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-green-600 hover:bg-green-500"
              disabled={!canSave || saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
