'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { VendorSlotSearchPicker, type VendorPickRow } from '@/components/admin/VendorSlotSearchPicker';
import {
  getSmokersClubExplicitAssignments,
  SMOKERS_CLUB_SLOT_RANK_MAX,
  SMOKERS_CLUB_SLOT_RANK_MIN,
  SMOKERS_CLUB_TREEHOUSE_LANE,
} from '@/lib/smokersClub';
import { marketplaceCopy } from '@/lib/marketplaceCopy';
import { AdminSmokersClubPlacementPreviewCharts } from '@/components/admin/AdminSmokersClubPlacementPreviewCharts';
import { useAdminWorkspaceRegion } from '@/contexts/AdminRegionContext';
import type { AdminWorkspaceRegion } from '@/lib/adminRegionWorkspace';
import { ADMIN_VENDOR_ID_IN_CHUNK } from '@/lib/adminVendorsByRegion';

type Market = { id: string; name: string; slug: string; region_key?: string | null };

const SLOTS = [1, 2, 3, 4, 5, 6, 7] as const;

/** PostgREST returns at most 1000 rows per request; paginate so pickers include N–Z and beyond. */
const LIVE_VENDOR_PAGE_SIZE = 1000;

type LiveVendorPickerRow = {
  id: string;
  name: string | null;
  offers_delivery: boolean | null;
  offers_storefront: boolean | null;
  smokers_club_eligible: boolean | null;
  is_live: boolean | null;
  license_status: string | null;
};

async function fetchAllLiveVendorsForFeaturePickers(
  client: typeof supabase
): Promise<LiveVendorPickerRow[]> {
  const all: LiveVendorPickerRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from('vendors')
      .select('id,name,offers_delivery,offers_storefront,smokers_club_eligible,is_live,license_status')
      .eq('is_live', true)
      .order('name')
      .range(from, from + LIVE_VENDOR_PAGE_SIZE - 1);
    if (error) throw error;
    const chunk = (data || []) as LiveVendorPickerRow[];
    all.push(...chunk);
    if (chunk.length < LIVE_VENDOR_PAGE_SIZE) break;
    from += LIVE_VENDOR_PAGE_SIZE;
  }
  return all;
}

async function fetchLiveVendorsForAdminWorkspace(
  client: typeof supabase,
  accessToken: string | null | undefined,
  region: AdminWorkspaceRegion
): Promise<LiveVendorPickerRow[]> {
  if (region === 'all') {
    return fetchAllLiveVendorsForFeaturePickers(client);
  }
  if (!accessToken) return [];
  const u = new URL('/api/admin/vendor-ids-by-region', window.location.origin);
  u.searchParams.set('region', region);
  const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  const j = (await res.json().catch(() => ({}))) as { error?: string; ids?: string[] | null };
  if (!res.ok) {
    throw new Error(typeof j.error === 'string' ? j.error : 'Could not load vendors for workspace');
  }
  const ids = j.ids;
  if (!ids?.length) return [];
  const all: LiveVendorPickerRow[] = [];
  for (let i = 0; i < ids.length; i += ADMIN_VENDOR_ID_IN_CHUNK) {
    const part = ids.slice(i, i + ADMIN_VENDOR_ID_IN_CHUNK);
    const { data, error } = await client
      .from('vendors')
      .select('id,name,offers_delivery,offers_storefront,smokers_club_eligible,is_live,license_status')
      .eq('is_live', true)
      .in('id', part);
    if (error) throw error;
    all.push(...((data || []) as LiveVendorPickerRow[]));
  }
  all.sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
  );
  return all;
}

function slotMapFromListingRows(rows: { vendor_id: string; slot_rank: number }[]): Record<number, string> {
  const byRank = new Map<number, string>();
  for (const r of rows) {
    if (r.slot_rank >= SMOKERS_CLUB_SLOT_RANK_MIN && r.slot_rank <= SMOKERS_CLUB_SLOT_RANK_MAX) {
      byRank.set(r.slot_rank, r.vendor_id);
    }
  }
  const out: Record<number, string> = {};
  const seen = new Set<string>();
  for (let rank = SMOKERS_CLUB_SLOT_RANK_MIN; rank <= SMOKERS_CLUB_SLOT_RANK_MAX; rank++) {
    const vid = byRank.get(rank);
    if (vid && !seen.has(vid)) {
      out[rank] = vid;
      seen.add(vid);
    }
  }
  return out;
}

/** Homepage tree ladder + Discover featured strips. Searchable dispensary pickers per slot. */
export function AdminFeaturesPanel({ showHelpLink }: { showHelpLink?: boolean }) {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const vendorsSchema = useVendorsSchema();
  const { region: workspaceRegion } = useAdminWorkspaceRegion();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketId, setMarketId] = useState<string>('');
  const [vendors, setVendors] = useState<VendorPickRow[]>([]);
  const [slotVendor, setSlotVendor] = useState<Record<number, string>>({});
  const [deliveryStripSlots, setDeliveryStripSlots] = useState<Record<number, string>>({});
  const [storefrontStripSlots, setStorefrontStripSlots] = useState<Record<number, string>>({});
  const [approvedVendorIds, setApprovedVendorIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripSaving, setStripSaving] = useState<'delivery' | 'storefront' | null>(null);

  useEffect(() => {
    if (authLoading || !isAdmin || !vendorsSchema) return;
    void (async () => {
      const { data: m } = await supabase.from('listing_markets').select('id,name,slug,region_key').order('sort_order');
      let list = (m || []) as Market[];
      if (workspaceRegion === 'ca' || workspaceRegion === 'ny') {
        list = list.filter((mk) => (mk.region_key || '').toLowerCase() === workspaceRegion);
      }
      setMarkets(list);
      setMarketId((prev) => (list.some((x) => x.id === prev) ? prev : list[0]?.id ?? ''));
    })();
  }, [authLoading, isAdmin, vendorsSchema, workspaceRegion]);

  useEffect(() => {
    if (!marketId || !isAdmin || !vendorsSchema) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const vlist = await fetchLiveVendorsForAdminWorkspace(supabase, token, workspaceRegion);
        if (cancelled) return;
        const [{ data: thList }, { data: dList }, { data: sList }, { data: ops }] = await Promise.all([
          supabase
            .from('smokers_club_slot_pins')
            .select('vendor_id,slot_rank,active,club_lane')
            .eq('club_lane', SMOKERS_CLUB_TREEHOUSE_LANE)
            .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
            .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
            .eq('active', true),
          supabase
            .from('smokers_club_slot_pins')
            .select('vendor_id,slot_rank,active,club_lane')
            .eq('club_lane', 'delivery')
            .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
            .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
            .eq('active', true),
          supabase
            .from('smokers_club_slot_pins')
            .select('vendor_id,slot_rank,active,club_lane')
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
          vlist.map((v) => ({
            id: v.id,
            name: v.name || 'Untitled',
            offers_delivery: v.offers_delivery === true,
            offers_storefront: v.offers_storefront === true,
            smokers_club_eligible: v.smokers_club_eligible === true,
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
        setDeliveryStripSlots(slotMapFromListingRows((dList || []) as Row[]));
        setStorefrontStripSlots(slotMapFromListingRows((sList || []) as Row[]));
      } catch (e: unknown) {
        if (!cancelled) {
          console.error(e);
          toast({
            title: 'Could not load feature slots',
            description: e instanceof Error ? e.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketId, isAdmin, vendorsSchema, workspaceRegion, toast]);

  const inTreehousePicker = vendors.filter((v) => v.offers_delivery || v.offers_storefront);
  const approvedInLane = inTreehousePicker.filter((v) => approvedVendorIds.has(v.id));
  const needsAreaApproval = inTreehousePicker.filter((v) => !approvedVendorIds.has(v.id));

  const selectOptions = (() => {
    const byId = new Map<string, VendorPickRow>();
    const addSorted = (list: VendorPickRow[]) => {
      for (const v of [...list].sort((a, b) => a.name.localeCompare(b.name))) {
        if (!byId.has(v.id)) byId.set(v.id, v);
      }
    };
    addSorted(approvedInLane);
    addSorted(needsAreaApproval);
    return Array.from(byId.values());
  })();

  const deliveryPickerOptions = selectOptions.filter((v) => v.offers_delivery);
  const storefrontPickerOptions = selectOptions.filter((v) => v.offers_storefront);

  const saveDiscoverStrip = async (lane: 'delivery' | 'storefront', slots: Record<number, string>) => {
    setStripSaving(lane);
    try {
      await supabase
        .from('smokers_club_slot_pins')
        .delete()
        .eq('club_lane', lane)
        .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
        .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);

      const usedVendor = new Set<string>();
      const rows: {
        vendor_id: string;
        slot_rank: number;
        active: boolean;
        club_lane: 'delivery' | 'storefront';
      }[] = [];

      for (const rank of SLOTS) {
        const vid = slots[rank];
        if (!vid || usedVendor.has(vid)) continue;
        usedVendor.add(vid);
        rows.push({
          vendor_id: vid,
          slot_rank: rank,
          active: true,
          club_lane: lane,
        });
      }

      if (rows.length) {
        const { error } = await supabase.from('smokers_club_slot_pins').insert(rows);
        if (error) throw error;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'smokers_club.discover_strip.save',
        summary: `Saved Discover ${lane} strip (global smokers_club_slot_pins)`,
        resourceType: 'smokers_club_slot_pins',
        resourceId: lane,
        metadata: { lane, vendor_count: rows.length },
      });
      toast({
        title: 'Discover strip saved',
        description:
          lane === 'delivery'
            ? 'Featured delivery row updated (global).'
            : 'Featured storefront row updated (global).',
      });
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setStripSaving(null);
    }
  };

  const saveTree = async () => {
    setSaving(true);
    try {
      await supabase
        .from('smokers_club_slot_pins')
        .delete()
        .eq('club_lane', SMOKERS_CLUB_TREEHOUSE_LANE)
        .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
        .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);

      const usedVendor = new Set<string>();
      const rows: {
        vendor_id: string;
        slot_rank: number;
        active: boolean;
        club_lane: typeof SMOKERS_CLUB_TREEHOUSE_LANE;
      }[] = [];

      for (const rank of SLOTS) {
        const vid = slotVendor[rank];
        if (!vid || usedVendor.has(vid)) continue;
        usedVendor.add(vid);
        rows.push({
          vendor_id: vid,
          slot_rank: rank,
          active: true,
          club_lane: SMOKERS_CLUB_TREEHOUSE_LANE,
        });
      }

      if (rows.length) {
        const { error } = await supabase.from('smokers_club_slot_pins').insert(rows);
        if (error) throw error;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'smokers_club.tree.save',
        summary: 'Saved Smokers Club tree ladder (global smokers_club_slot_pins)',
        resourceType: 'smokers_club_slot_pins',
        resourceId: SMOKERS_CLUB_TREEHOUSE_LANE,
        metadata: { vendor_count: rows.length },
      });
      toast({
        title: 'Smokers Club updated',
        description: 'Tree ladder saved globally. With shopper geo, pins only apply within 15 mi (or delivery-ZIP override).',
      });
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

  if (!vendorsSchema) {
    return (
      <Card className="border-amber-900/30 bg-amber-950/10 p-6 text-amber-100/90">
        Enable <code className="text-white">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code> to manage feature slots.
      </Card>
    );
  }

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      {showHelpLink ? (
        <Card className="border-green-900/25 bg-gray-950/80 p-4 text-sm text-gray-300">
          Feature slots are global (<code className="text-white">smokers_club_slot_pins</code>). Listing market below
          only affects which vendors show as area-approved in pickers. Use search in each row to find a dispensary
          fast. Full-page editor with ad slideshows:{' '}
          <Link href="/admin/smokers-club" className="text-brand-lime-soft underline hover:text-white">
            /admin/smokers-club
          </Link>
          .
        </Card>
      ) : null}

      <Card className="space-y-6 border-green-900/25 bg-gray-950/80 p-6">
        <div>
          <Label>Listing market (ops approval reference)</Label>
          <Select value={marketId} onValueChange={setMarketId}>
            <SelectTrigger className="mt-2 border-green-900/30 bg-gray-900">
              <SelectValue placeholder="Choose market" />
            </SelectTrigger>
            <SelectContent>
              {markets.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                  {m.region_key ? ` (${String(m.region_key).toUpperCase()})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-gray-500">
          Picker lists live vendors with delivery and/or storefront. Manage licenses on{' '}
          <Link href="/admin/vendors" className="underline hover:text-white">
            /admin/vendors
          </Link>
          .
        </p>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        ) : (
          <>
            <AdminSmokersClubPlacementPreviewCharts
              treeSlots={slotVendor}
              deliverySlots={deliveryStripSlots}
              storefrontSlots={storefrontStripSlots}
              vendors={vendors}
            />
            <div className="space-y-4 border-b border-green-900/20 pb-8">
              <h2 className="text-lg font-semibold text-white">Homepage Smokers Club — tree ladder (7 slots)</h2>
              <p className="text-sm text-gray-500">{marketplaceCopy.adminSmokersIntro}</p>
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
              {SLOTS.map((rank) => (
                <div key={rank} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="w-28 shrink-0 text-sm text-gray-500">
                    Slot {rank}
                    {rank === 1 ? ' · prime' : rank === 7 ? ' · light' : ''}
                  </span>
                  <div className="min-w-0 flex-1">
                    <VendorSlotSearchPicker
                      variant="tree"
                      valueId={slotVendor[rank]}
                      approvedVendorIds={approvedVendorIds}
                      options={selectOptions}
                      onChange={(id) => {
                        setSlotVendor((prev) => {
                          const next = { ...prev };
                          if (!id) delete next[rank];
                          else next[rank] = id;
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
              <Button onClick={() => void saveTree()} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save tree ladder'}
              </Button>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Discover — featured delivery (7)</h2>
              <p className="text-sm text-gray-500">
                Global delivery strip pins; empty slots still auto-fill in-app. Shoppers outside a pin vendor&apos;s
                radius may not see that pin.
              </p>
              {SLOTS.map((rank) => (
                <div key={`d-${rank}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="w-28 shrink-0 text-sm text-gray-500">Delivery {rank}</span>
                  <div className="min-w-0 flex-1">
                    <VendorSlotSearchPicker
                      variant="strip"
                      valueId={deliveryStripSlots[rank]}
                      approvedVendorIds={approvedVendorIds}
                      options={deliveryPickerOptions}
                      onChange={(id) => {
                        setDeliveryStripSlots((prev) => {
                          const next = { ...prev };
                          if (!id) delete next[rank];
                          else next[rank] = id;
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={() => void saveDiscoverStrip('delivery', deliveryStripSlots)}
                disabled={stripSaving !== null}
                className="bg-green-600 hover:bg-green-700"
              >
                {stripSaving === 'delivery' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save delivery strip'}
              </Button>
            </div>

            <div className="space-y-4 border-t border-green-900/20 pt-8">
              <h2 className="text-lg font-semibold text-white">Discover — featured storefronts (7)</h2>
              {SLOTS.map((rank) => (
                <div key={`s-${rank}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="w-28 shrink-0 text-sm text-gray-500">Storefront {rank}</span>
                  <div className="min-w-0 flex-1">
                    <VendorSlotSearchPicker
                      variant="strip"
                      valueId={storefrontStripSlots[rank]}
                      approvedVendorIds={approvedVendorIds}
                      options={storefrontPickerOptions}
                      onChange={(id) => {
                        setStorefrontStripSlots((prev) => {
                          const next = { ...prev };
                          if (!id) delete next[rank];
                          else next[rank] = id;
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={() => void saveDiscoverStrip('storefront', storefrontStripSlots)}
                disabled={stripSaving !== null}
                className="bg-green-600 hover:bg-green-700"
              >
                {stripSaving === 'storefront' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save storefront strip'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
