'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminSmokersClubBannersPanel } from '@/components/admin/AdminSmokersClubBannersPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  getSmokersClubExplicitAssignments,
  SMOKERS_CLUB_SLOT_RANK_MAX,
  SMOKERS_CLUB_SLOT_RANK_MIN,
  SMOKERS_CLUB_TREEHOUSE_LANE,
} from '@/lib/smokersClub';
import { marketplaceCopy } from '@/lib/marketplaceCopy';

type Market = { id: string; name: string; slug: string };
type VendorOpt = {
  id: string;
  name: string;
  offers_delivery: boolean;
  offers_storefront: boolean;
  smokers_club_eligible: boolean;
  is_live: boolean;
  license_status: string;
};

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function AdminSmokersClubPage() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketId, setMarketId] = useState<string>('');
  const [vendors, setVendors] = useState<VendorOpt[]>([]);
  const [slotVendor, setSlotVendor] = useState<Record<number, string>>({});
  const [approvedVendorIds, setApprovedVendorIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !isAdmin || !isVendorsSchema()) return;
    (async () => {
      const { data: m } = await supabase.from('listing_markets').select('id,name,slug').order('sort_order');
      const list = (m || []) as Market[];
      setMarkets(list);
      if (list[0] && !marketId) setMarketId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial market pick once
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (!marketId || !isAdmin || !isVendorsSchema()) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: vlist }, { data: thList }, { data: dList }, { data: sList }, { data: ops }] =
        await Promise.all([
          supabase
            .from('vendors')
            .select('id,name,offers_delivery,offers_storefront,smokers_club_eligible,is_live,license_status')
            .eq('is_live', true)
            .order('name'),
          supabase
            .from('vendor_market_listings')
            .select('vendor_id,slot_rank,active,club_lane')
            .eq('market_id', marketId)
            .eq('club_lane', SMOKERS_CLUB_TREEHOUSE_LANE)
            .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
            .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
            .eq('active', true),
          supabase
            .from('vendor_market_listings')
            .select('vendor_id,slot_rank,active,club_lane')
            .eq('market_id', marketId)
            .eq('club_lane', 'delivery')
            .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
            .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
            .eq('active', true),
          supabase
            .from('vendor_market_listings')
            .select('vendor_id,slot_rank,active,club_lane')
            .eq('market_id', marketId)
            .eq('club_lane', 'storefront')
            .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
            .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
            .eq('active', true),
          supabase
            .from('vendor_market_operations')
            .select('vendor_id')
            .eq('market_id', marketId)
            .eq('approved', true),
        ]);
      if (cancelled) return;
      setApprovedVendorIds(new Set((ops || []).map((r: { vendor_id: string }) => r.vendor_id)));
      setVendors(
        (
          (vlist || []) as {
            id: string;
            name: string | null;
            offers_delivery: boolean | null;
            offers_storefront: boolean | null;
            smokers_club_eligible: boolean | null;
            is_live: boolean | null;
            license_status: string | null;
          }[]
        ).map((v) => ({
          id: v.id,
          name: v.name || 'Untitled',
          offers_delivery: v.offers_delivery === true,
          offers_storefront: v.offers_storefront === true,
          smokers_club_eligible: v.smokers_club_eligible === true,
          is_live: v.is_live !== false,
          license_status: v.license_status ? String(v.license_status) : '',
        }))
      );
      type Row = { vendor_id: string; slot_rank: number };
      const next = getSmokersClubExplicitAssignments(
        (dList || []) as Row[],
        (sList || []) as Row[],
        (thList || []) as Row[]
      );
      setSlotVendor(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [marketId, isAdmin]);

  const inTreehousePicker = vendors.filter((v) => v.offers_delivery || v.offers_storefront);
  const approvedInLane = inTreehousePicker.filter((v) => approvedVendorIds.has(v.id));
  const needsAreaApproval = inTreehousePicker.filter((v) => !approvedVendorIds.has(v.id));

  const selectOptions = (() => {
    const byId = new Map<string, VendorOpt>();
    const addSorted = (list: VendorOpt[]) => {
      for (const v of [...list].sort((a, b) => a.name.localeCompare(b.name))) {
        if (!byId.has(v.id)) byId.set(v.id, v);
      }
    };
    addSorted(approvedInLane);
    addSorted(needsAreaApproval);
    return Array.from(byId.values());
  })();

  const save = async () => {
    if (!marketId) return;
    setSaving(true);
    try {
      await supabase
        .from('vendor_market_listings')
        .delete()
        .eq('market_id', marketId)
        .eq('club_lane', SMOKERS_CLUB_TREEHOUSE_LANE)
        .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
        .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);

      const usedVendor = new Set<string>();
      const rows: {
        market_id: string;
        vendor_id: string;
        slot_rank: number;
        active: boolean;
        is_premium: boolean;
        club_lane: typeof SMOKERS_CLUB_TREEHOUSE_LANE;
      }[] = [];

      for (const rank of SLOTS) {
        const vid = slotVendor[rank];
        if (!vid || usedVendor.has(vid)) continue;
        usedVendor.add(vid);
        rows.push({
          market_id: marketId,
          vendor_id: vid,
          slot_rank: rank,
          active: true,
          is_premium: true,
          club_lane: SMOKERS_CLUB_TREEHOUSE_LANE,
        });
      }

      if (rows.length) {
        const { error } = await supabase.from('vendor_market_listings').insert(rows);
        if (error) throw error;
      }
      toast({ title: 'Smokers Club updated', description: 'Treehouse ladder saved.' });
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-gray-400">Loading…</div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Card className="border-red-900/30 bg-gray-900 p-8 text-white">Access denied</Card>
      </div>
    );
  }
  if (!isVendorsSchema()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <p className="text-gray-400">Enable NEXT_PUBLIC_USE_VENDORS_TABLE=1 for Smokers Club admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-4xl">
        <Button asChild variant="ghost" className="mb-6 text-gray-400">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Admin
          </Link>
        </Button>
        <h1 className="mb-2 text-3xl font-bold">Smokers Club</h1>
        <p className="mb-6 text-gray-400">{marketplaceCopy.adminSmokersIntro}</p>

        <Tabs defaultValue="tree" className="space-y-6">
          <TabsList className="border border-green-900/30 bg-gray-900/80">
            <TabsTrigger value="tree">Tree ladder</TabsTrigger>
            <TabsTrigger value="banners">Homepage banners</TabsTrigger>
          </TabsList>

          <TabsContent value="banners">
            <AdminSmokersClubBannersPanel />
          </TabsContent>

          <TabsContent value="tree">
        <Card className="space-y-6 border-green-900/25 bg-gray-950/80 p-6">
          <div>
            <Label>Market (CA zone)</Label>
            <Select value={marketId} onValueChange={setMarketId}>
              <SelectTrigger className="mt-2 border-green-900/30 bg-gray-900">
                <SelectValue placeholder="Choose market" />
              </SelectTrigger>
              <SelectContent>
                {markets.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-gray-500">
            Picker includes vendors with <code className="text-gray-400">offers_delivery</code> and/or{' '}
            <code className="text-gray-400">offers_storefront</code> (set on{' '}
            <Link href="/admin/vendors" className="underline hover:text-white">
              /admin/vendors
            </Link>
            ).
          </p>

          {inTreehousePicker.length === 0 && (
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-200/90">
              {marketplaceCopy.adminSmokersNoPickerMatches}{' '}
              <Link href="/admin/vendors" className="underline hover:text-white">
                /admin/vendors
              </Link>
              .
            </p>
          )}
          {needsAreaApproval.length > 0 && (
            <p className="rounded-lg border border-blue-900/35 bg-blue-950/15 p-3 text-sm text-gray-300">
              {marketplaceCopy.adminSmokersAreasHint}
            </p>
          )}

          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          ) : (
            <div className="space-y-4">
              {SLOTS.map((rank) => (
                <div key={rank} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="w-20 shrink-0 text-sm text-gray-500">
                    Slot {rank}
                    {rank === 1 ? ' · prime' : rank === 10 ? ' · light' : ''}
                  </span>
                  <Select
                    value={slotVendor[rank] || '__none__'}
                    onValueChange={(v) =>
                      setSlotVendor((prev) => {
                        const next = { ...prev };
                        if (v === '__none__') delete next[rank];
                        else next[rank] = v;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger className="flex-1 border-green-900/30 bg-gray-900">
                      <SelectValue placeholder="Open (auto backfill)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Open (auto backfill)</SelectItem>
                      {selectOptions.map((v) => {
                        const areaOk = approvedVendorIds.has(v.id);
                        const suffixParts: string[] = [];
                        if (!areaOk) suffixParts.push(' · Approve in Areas');
                        else if (v.license_status !== 'approved') suffixParts.push(' · License not approved');
                        else if (!v.smokers_club_eligible)
                          suffixParts.push(' · Smokers Club off (backfill only)');
                        const suffix = suffixParts.join('');
                        return (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                            {suffix}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <Button onClick={save} disabled={saving || !marketId} className="bg-green-600 hover:bg-green-700">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save treehouse ladder'
            )}
          </Button>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
