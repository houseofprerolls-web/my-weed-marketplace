'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VendorNav from '@/components/vendor/VendorNav';
import { UpgradeRequestButton } from '@/components/vendor/UpgradeRequestButton';
import { Tag, Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type DealRow = {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number;
  start_date: string;
  end_date: string;
  created_at: string;
  deal_options?: Record<string, unknown> | null;
};

function dealStatus(start: string, end: string): 'Active' | 'Scheduled' | 'Ended' {
  const now = new Date();
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  if (now < s) return 'Scheduled';
  if (now > e) return 'Ended';
  return 'Active';
}

export default function VendorDealsPage() {
  const { toast } = useToast();
  const { loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vendor?.id || !vendorsMode) {
      setDeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('deals')
      .select('id,title,description,discount_percent,start_date,end_date,created_at,deal_options')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast({ title: 'Could not load deals', description: error.message, variant: 'destructive' });
      setDeals([]);
    } else {
      setDeals((data || []) as DealRow[]);
    }
    setLoading(false);
  }, [vendor?.id, vendorsMode]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!vendor?.id) return;
    if (!confirm('Delete this deal?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('deals').delete().eq('id', id).eq('vendor_id', vendor.id);
    setDeletingId(null);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Deal removed' });
    load();
  }

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!mayEnterVendorShell || !vendorsMode) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">Deals require a linked store and vendors mode.</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">No dispensary linked to this account.</p>
      </div>
    );
  }

  const optsPreview = (o: Record<string, unknown> | null | undefined) => {
    if (!o || typeof o !== 'object') return null;
    const parts: string[] = [];
    if (o.badge_label) parts.push(String(o.badge_label));
    if (o.promo_code) parts.push(`code: ${o.promo_code}`);
    if (o.bogo) parts.push('BOGO');
    if (o.spotlight) parts.push('spotlight');
    return parts.length ? parts.join(' · ') : null;
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-white">Deals &amp; offers</h1>
              <p className="text-gray-400">Create and manage promotions for your store</p>
            </div>
            <Button asChild className="bg-green-600 text-white hover:bg-green-700">
              <Link href="/vendor/deals/new">
                <Plus className="mr-2 h-5 w-5" />
                Create new deal
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>

          <div className="space-y-6 lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
              </div>
            ) : deals.length === 0 ? (
              <Card className="border-green-900/20 bg-gray-900/50 p-12 text-center">
                <Tag className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                <p className="text-gray-400">No deals yet.</p>
                <Button asChild className="mt-6 bg-green-600 hover:bg-green-700">
                  <Link href="/vendor/deals/new">Create your first deal</Link>
                </Button>
              </Card>
            ) : (
              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-lg bg-green-600/20 p-3">
                    <Tag className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Your deals</h2>
                    <p className="text-sm text-gray-400">{deals.length} total</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {deals.map((deal) => {
                    const status = dealStatus(deal.start_date, deal.end_date);
                    const creative = optsPreview(deal.deal_options);
                    return (
                      <Card key={deal.id} className="border-green-900/20 bg-gray-800/50 p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-bold text-white">{deal.title}</h3>
                              <Badge
                                className={
                                  status === 'Active'
                                    ? 'border-green-600/30 bg-green-600/20 text-green-500'
                                    : status === 'Scheduled'
                                      ? 'border-yellow-600/30 bg-yellow-600/20 text-yellow-500'
                                      : 'border-gray-600/30 bg-gray-700/50 text-gray-400'
                                }
                              >
                                {status}
                              </Badge>
                            </div>
                            {deal.description && <p className="mb-3 text-sm text-gray-400">{deal.description}</p>}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                              <span className="font-medium text-green-400/90">{deal.discount_percent}% off</span>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {deal.start_date} → {deal.end_date}
                                </span>
                              </div>
                            </div>
                            {creative && <p className="mt-2 text-xs text-purple-300/90">{creative}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-gray-400 hover:text-red-500"
                              disabled={deletingId === deal.id}
                              onClick={() => handleDelete(deal.id)}
                              aria-label="Delete deal"
                            >
                              {deletingId === deal.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Trash2 className="h-5 w-5" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {status === 'Active' && (
                          <div className="mt-4 rounded-lg border border-purple-600/20 bg-purple-600/10 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <p className="mb-1 font-semibold text-white">Boost visibility</p>
                                <p className="text-sm text-gray-400">Ask our team about sponsored placement for this deal.</p>
                              </div>
                              <UpgradeRequestButton
                                requestContext={`Sponsored deal / upgrade — "${deal.title}" (${deal.id})`}
                                className="bg-purple-600 text-white hover:bg-purple-700"
                              >
                                Upgrade to sponsored
                              </UpgradeRequestButton>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="border-green-900/20 bg-gradient-to-br from-green-950/30 to-black p-6">
              <h3 className="mb-4 text-xl font-bold text-white">Tips</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                  <span>Use clear titles and real end dates so shoppers trust the offer.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                  <span>Creative options (badge, accent, promo code) are ready for richer storefront UI.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
