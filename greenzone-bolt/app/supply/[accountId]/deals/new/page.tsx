'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';

export default function SupplyNewDealPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const { toast } = useToast();
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const h = headline.trim();
    if (!accountId || !h) {
      toast({ variant: 'destructive', title: 'Headline is required' });
      return;
    }
    const dp = discount.trim() === '' ? null : Number(discount);
    if (discount.trim() !== '' && (Number.isNaN(dp) || dp! < 0 || dp! > 100)) {
      toast({ variant: 'destructive', title: 'Discount must be between 0 and 100' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('b2b_supply_deals')
        .insert({
          supply_account_id: accountId,
          headline: h,
          description: description.trim() || null,
          discount_percent: dp,
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      toast({ title: 'Deal created' });
      router.push(`/supply/${accountId}/deals/${(data as { id: string }).id}`);
    } catch (e: unknown) {
      toast({ title: 'Could not create deal', description: formatSupabaseError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!accountId) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-400 hover:text-white">
        <Link href={`/supply/${accountId}/deals`} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Deals
        </Link>
      </Button>
      <div>
        <h1 className="text-xl font-bold text-white">New deal</h1>
        <p className="mt-1 text-sm text-zinc-500">Create the deal first, then attach catalog products on the next screen.</p>
      </div>
      <Card className="space-y-4 border-zinc-800 bg-zinc-900/80 p-6">
        <div>
          <Label>Headline</Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Spring case stack · 15% off"
            className="mt-1 border-zinc-700 bg-zinc-950 text-white"
          />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 border-zinc-700 bg-zinc-950 text-white"
            placeholder="Shown to your team; vendors see the headline on your supplier profile."
          />
        </div>
        <div>
          <Label>Default discount % (optional)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="e.g. 10"
            className="mt-1 border-zinc-700 bg-zinc-950 text-white"
          />
        </div>
        <Button type="button" disabled={saving} className="bg-green-700 hover:bg-green-600" onClick={() => void create()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & add products'}
        </Button>
      </Card>
    </div>
  );
}
