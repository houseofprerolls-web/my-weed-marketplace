'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { LicenseExpiringSoonBanner } from '@/components/admin/LicenseExpiringSoonBanner';
import { useToast } from '@/hooks/use-toast';
import {
  fetchVendorAdminStats,
  fetchVendorAdminStatsMany,
  type VendorAdminStats,
} from '@/lib/adminVendorStats';
import { ArrowLeft, BarChart3, Building2, Loader2, MapPin } from 'lucide-react';
import { listingHrefForVendor } from '@/lib/listingPath';

type LiveVendor = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  smokers_club_eligible?: boolean;
  map_visible_override?: boolean;
};

function ListingAvatarLink({
  vendorId,
  vendorSlug,
  name,
  logoUrl,
  size = 'md',
}: {
  vendorId: string;
  vendorSlug?: string | null;
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const wh = size === 'sm' ? 'h-8 w-8 min-h-8 min-w-8' : 'h-12 w-12 min-h-12 min-w-12';
  const textSz = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <Link
      href={listingHrefForVendor({ id: vendorId, slug: vendorSlug })}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 rounded-lg ring-green-500/0 transition hover:ring-2 hover:ring-green-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60"
      aria-label={`View ${name} public storefront (opens new tab)`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`flex ${wh} items-center justify-center overflow-hidden rounded-lg border border-green-800/40 bg-green-950/30`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={`font-semibold text-green-400 ${textSz}`}>
            {(name.trim().charAt(0) || '?').toUpperCase()}
          </span>
        )}
      </div>
    </Link>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-green-900/25 bg-black/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export default function AdminVendorHubPage() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const vendorsMode = useVendorsSchema();

  const [live, setLive] = useState<LiveVendor[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [focusedId, setFocusedId] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [focusStats, setFocusStats] = useState<VendorAdminStats | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [mapSaving, setMapSaving] = useState(false);
  const [compareStats, setCompareStats] = useState<VendorAdminStats[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  const loadLive = useCallback(async () => {
    if (!vendorsMode) return;
    setListLoading(true);
    const { data, error } = await supabase
      .from('vendors')
      .select('id,name,slug,logo_url,smokers_club_eligible,map_visible_override')
      .eq('is_live', true)
      .order('name');

    if (error) {
      console.error(error);
      toast({ title: 'Could not load dispensaries', description: error.message, variant: 'destructive' });
      setLive([]);
    } else {
      const rows = (data || []).map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          name: String(row.name ?? ''),
          slug: String(row.slug ?? ''),
          logo_url: (row.logo_url as string | null | undefined) ?? null,
          smokers_club_eligible: row.smokers_club_eligible === true,
          map_visible_override: row.map_visible_override === true,
        };
      });
      setLive(rows);
      setFocusedId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id || ''));
    }
    setListLoading(false);
  }, [vendorsMode, toast]);

  useEffect(() => {
    if (!authLoading && isAdmin && vendorsMode) {
      loadLive();
    } else if (!authLoading) {
      setListLoading(false);
    }
  }, [authLoading, isAdmin, vendorsMode, loadLive]);

  useEffect(() => {
    if (!focusedId || !vendorsMode) {
      setFocusStats(null);
      return;
    }
    let cancelled = false;
    setFocusLoading(true);
    fetchVendorAdminStats(focusedId).then((s) => {
      if (!cancelled) {
        setFocusStats(s);
        setFocusLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [focusedId, vendorsMode]);

  useEffect(() => {
    if (!vendorsMode || compareIds.length < 2) {
      setCompareStats([]);
      setCompareLoading(false);
      return;
    }
    let cancelled = false;
    setCompareLoading(true);
    fetchVendorAdminStatsMany(compareIds).then((rows) => {
      if (!cancelled) {
        setCompareStats(rows);
        setCompareLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [compareIds, vendorsMode]);

  async function setFocusedVendorMapVisible(nextVisible: boolean) {
    if (!focusedId) return;
    setMapSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ map_visible_override: nextVisible })
        .eq('id', focusedId);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.map_visible_override',
        summary: `${nextVisible ? 'Show' : 'Hide'} vendor ${focusedId} on customer map`,
        resourceType: 'vendor',
        resourceId: focusedId,
        metadata: { map_visible_override: nextVisible },
      });
      setLive((prev) =>
        prev.map((row) => (row.id === focusedId ? { ...row, map_visible_override: nextVisible } : row))
      );
      toast({
        title: nextVisible ? 'Shown on customer map' : 'Hidden from map (Smokers Club only)',
        description: nextVisible
          ? 'Pins appear on Discover and Map even without Smokers Club.'
          : 'Pins only show for Smokers Club placements unless you turn this on again.',
      });
    } catch (e: unknown) {
      toast({
        title: 'Could not update map visibility',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setMapSaving(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast({ title: 'Compare limit', description: 'You can compare up to three dispensaries at once.' });
        return prev;
      }
      return [...prev, id];
    });
  }

  if (authLoading || (isAdmin && vendorsMode && listLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="border-red-900/20 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
          <p className="text-white">Access denied</p>
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <Card className="mx-auto max-w-lg border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-8">
          <p className="text-gray-300">Vendor hub requires the unified vendors schema.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/admin">Back to admin</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const metrics: { key: keyof VendorAdminStats; label: string; format: (s: VendorAdminStats) => string }[] = [
    { key: 'orderCount', label: 'Orders', format: (s) => String(s.orderCount) },
    { key: 'orderRevenueCents', label: 'Revenue', format: (s) => formatMoney(s.orderRevenueCents) },
    { key: 'reviewCount', label: 'Reviews', format: (s) => String(s.reviewCount) },
    { key: 'avgRating', label: 'Avg rating', format: (s) => (s.avgRating != null ? String(s.avgRating) : '—') },
    { key: 'analyticsEventCount', label: 'Analytics events', format: (s) => String(s.analyticsEventCount) },
    {
      key: 'isDirectoryListing',
      label: 'Directory listing',
      format: (s) => (s.isDirectoryListing ? 'Yes' : s.userId ? 'No (claimed)' : '—'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <BarChart3 className="h-10 w-10 text-brand-lime" />
            <div>
              <h1 className="text-3xl font-bold text-white">Vendor hub</h1>
              <p className="text-gray-400">Switch between live dispensaries, view stats, compare up to three.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-950/50">
              <Link href="/admin/dispensaries">Add / link dispensaries</Link>
            </Button>
            <Button asChild variant="outline" className="border-green-600/50 text-green-400 hover:bg-green-950/50">
              <Link href={`/admin/vendors${focusedId ? `?vendor=${focusedId}` : ''}`}>Open vendor control (full settings)</Link>
            </Button>
          </div>
          <p className="mt-3 max-w-2xl text-xs text-gray-500">
            <span className="text-gray-400">Customer map:</span> by default only Smokers Club placements show pins. Use{' '}
            <span className="text-gray-300">Show on map</span> below on the focused store to unhide any dispensary — the
            same toggle also lives on each card under <span className="text-gray-300">Vendor control</span>.
          </p>
        </div>
      </div>

      <div className="container mx-auto space-y-8 px-4 py-8">
        <LicenseExpiringSoonBanner />
        {live.length === 0 ? (
          <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-8 text-center text-gray-400">
            No live dispensaries yet. Mark stores live or add one from Add / link dispensaries.
          </Card>
        ) : (
          <>
            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-lime" />
                <h2 className="text-lg font-semibold text-white">Focused dispensary</h2>
              </div>
              <Label className="text-gray-400">Select a store</Label>
              <Select value={focusedId} onValueChange={setFocusedId}>
                <SelectTrigger className="mt-2 max-w-md border-green-900/40 bg-black/50 text-white">
                  <SelectValue placeholder="Choose dispensary" />
                </SelectTrigger>
                <SelectContent>
                  {live.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {focusLoading ? (
                <div className="mt-6 flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
                </div>
              ) : focusStats ? (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                    <ListingAvatarLink
                      vendorId={focusStats.vendorId}
                      vendorSlug={focusStats.slug}
                      name={focusStats.name}
                      logoUrl={live.find((x) => x.id === focusedId)?.logo_url}
                    />
                    <span className="text-white">{focusStats.name}</span>
                    <span className="text-gray-600">·</span>
                    <span>/{focusStats.slug}</span>
                    {focusStats.userId ? (
                      <span className="rounded border border-green-800/50 px-2 py-0.5 text-xs text-green-400">
                        Claimed
                      </span>
                    ) : (
                      <span className="rounded border border-amber-800/50 px-2 py-0.5 text-xs text-amber-400">
                        Unclaimed
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <StatBlock label="Orders" value={String(focusStats.orderCount)} />
                    <StatBlock label="Revenue" value={formatMoney(focusStats.orderRevenueCents)} />
                    <StatBlock label="Reviews" value={String(focusStats.reviewCount)} />
                    <StatBlock label="Avg rating" value={focusStats.avgRating != null ? String(focusStats.avgRating) : '—'} />
                    <StatBlock label="Analytics events" value={String(focusStats.analyticsEventCount)} />
                  </div>

                  {(() => {
                    const fv = live.find((x) => x.id === focusedId);
                    if (!fv) return null;
                    return (
                      <div className="mt-6 rounded-xl border border-green-900/30 bg-black/50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-800/40 bg-green-950/30">
                              <MapPin className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">Show on customer map</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                When off, this shop only gets a map pin if it has a Smokers Club placement. Turn on to
                                always show pins on Discover and the Map page.
                              </p>
                              {fv.smokers_club_eligible && (
                                <p className="mt-1 text-xs text-green-600/90">Smokers Club eligible — pins already allowed.</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:shrink-0">
                            <span className="text-xs text-gray-400">{fv.map_visible_override ? 'Visible' : 'Smokers only'}</span>
                            <Switch
                              checked={fv.map_visible_override === true}
                              onCheckedChange={(v) => setFocusedVendorMapVisible(v === true)}
                              disabled={mapSaving}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="mt-6 text-gray-500">No stats loaded.</p>
              )}
            </Card>

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Compare dispensaries</h2>
                  <p className="text-sm text-gray-500">Select two or three live stores to compare key stats side by side.</p>
                </div>
                {compareIds.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300"
                    onClick={() => setCompareIds([])}
                  >
                    Clear selection
                  </Button>
                )}
              </div>
              <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-green-900/20 p-3">
                {live.map((v) => (
                  <label
                    key={v.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-white/5"
                  >
                    <Checkbox
                      checked={compareIds.includes(v.id)}
                      onCheckedChange={() => toggleCompare(v.id)}
                    />
                    <ListingAvatarLink
                      vendorId={v.id}
                      vendorSlug={v.slug}
                      name={v.name}
                      logoUrl={v.logo_url}
                      size="sm"
                    />
                    <span className="text-sm text-gray-200">{v.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Selected: {compareIds.length} / 3
                {compareIds.length < 2 && compareIds.length > 0 && ' · pick at least one more to see the table.'}
              </p>

              {compareIds.length >= 2 && (
                <div className="mt-6 overflow-x-auto">
                  {compareLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
                    </div>
                  ) : compareStats.length >= 2 ? (
                    <table className="w-full min-w-[480px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-green-900/30 text-left text-gray-500">
                          <th className="py-2 pr-4 font-medium">Metric</th>
                          {compareStats.map((s) => (
                            <th key={s.vendorId} className="py-2 pr-4 font-medium text-white">
                              <div className="flex items-center gap-2">
                                <ListingAvatarLink
                                  vendorId={s.vendorId}
                                  vendorSlug={live.find((x) => x.id === s.vendorId)?.slug}
                                  name={s.name}
                                  logoUrl={live.find((x) => x.id === s.vendorId)?.logo_url}
                                  size="sm"
                                />
                                <span className="max-w-[min(160px,28vw)] truncate">{s.name}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((m) => (
                          <tr key={m.key} className="border-b border-green-900/15">
                            <td className="py-3 pr-4 text-gray-400">{m.label}</td>
                            {compareStats.map((s) => (
                              <td key={`${s.vendorId}-${String(m.key)}`} className="py-3 pr-4 text-gray-200">
                                {m.format(s)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500">Could not load comparison data.</p>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
