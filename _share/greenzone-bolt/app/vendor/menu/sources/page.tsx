'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, RefreshCw, Link2, MapPin, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import VendorNav from '@/components/vendor/VendorNav';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { MenuSourceMode, VendorMenuProfileRow } from '@/lib/vendorMenuMerge';
import { POS_PROVIDER_OPTIONS } from '@/lib/posProviders';

type ConnRow = {
  id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
};

export default function VendorMenuSourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const menuVendorQuery = adminMenuVendorId ? `?vendor=${encodeURIComponent(adminMenuVendorId)}` : '';
  const { toast } = useToast();

  const [mode, setMode] = useState<MenuSourceMode>('manual');
  const [savingMode, setSavingMode] = useState(false);
  const [conns, setConns] = useState<ConnRow[]>([]);
  const [profiles, setProfiles] = useState<VendorMenuProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const [newRegion, setNewRegion] = useState('CA');
  const [newLabel, setNewLabel] = useState('Regional menu');
  const [copySource, setCopySource] = useState<string>('');
  const [copyTarget, setCopyTarget] = useState<string>('');

  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
  const [loadingHidden, setLoadingHidden] = useState(false);

  const load = useCallback(async () => {
    if (!vendor?.id || !vendorsMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [setRes, connRes, profRes, prodRes] = await Promise.all([
      supabase.from('vendor_menu_settings').select('menu_source_mode').eq('vendor_id', vendor.id).maybeSingle(),
      supabase.from('vendor_pos_connections').select('id,provider,status,last_sync_at,last_error').eq('vendor_id', vendor.id),
      supabase
        .from('vendor_menu_profiles')
        .select('id,vendor_id,region_key,label,is_master')
        .eq('vendor_id', vendor.id)
        .order('region_key'),
      supabase.from('products').select('id,name').eq('vendor_id', vendor.id).order('name'),
    ]);

    if (setRes.data?.menu_source_mode) {
      const m = setRes.data.menu_source_mode as string;
      if (m === 'manual' || m === 'pos' || m === 'hybrid') setMode(m);
    }
    setConns((connRes.data || []) as ConnRow[]);
    setProfiles((profRes.data || []) as VendorMenuProfileRow[]);
    setProducts((prodRes.data || []) as { id: string; name: string }[]);
    setLoading(false);
  }, [vendor?.id, vendorsMode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (profiles.length && !activeProfileId) {
      const master = profiles.find((p) => p.is_master);
      setActiveProfileId((master ?? profiles[0]).id);
    }
  }, [profiles, activeProfileId]);

  const loadHidden = useCallback(async () => {
    if (!activeProfileId) return;
    setLoadingHidden(true);
    const { data } = await supabase
      .from('vendor_menu_profile_hidden_products')
      .select('product_id')
      .eq('profile_id', activeProfileId);
    setHiddenSet(new Set((data || []).map((r) => r.product_id as string)));
    setLoadingHidden(false);
  }, [activeProfileId]);

  useEffect(() => {
    loadHidden();
  }, [loadHidden]);

  async function saveMenuMode() {
    if (!vendor?.id) return;
    setSavingMode(true);
    const { error } = await supabase.from('vendor_menu_settings').upsert(
      { vendor_id: vendor.id, menu_source_mode: mode, updated_at: new Date().toISOString() },
      { onConflict: 'vendor_id' }
    );
    setSavingMode(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Menu source updated', description: `Shoppers see: ${mode}` });
  }

  async function addConnection(provider: string) {
    if (!vendor?.id) return;
    const { error } = await supabase.from('vendor_pos_connections').upsert(
      {
        vendor_id: vendor.id,
        provider,
        status: 'disconnected',
        config: { note: 'Add API keys via secure admin flow (Vault) before live sync.' },
      },
      { onConflict: 'vendor_id,provider' }
    );
    if (error) {
      toast({ title: 'Could not save connection', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Connection row saved', description: 'Run sync when credentials are ready.' });
    load();
  }

  async function runSync(provider: string) {
    if (!vendor?.id) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    setSyncing(provider);
    try {
      const res = await fetch('/api/vendor/pos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendorId: vendor.id, provider }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast({ title: 'Sync failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      toast({ title: 'Sync recorded', description: j.message || 'OK' });
      load();
    } finally {
      setSyncing(null);
    }
  }

  async function createProfile() {
    if (!vendor?.id) return;
    const rk = newRegion.trim().toUpperCase().slice(0, 8) || 'DEFAULT';
    const { error } = await supabase.from('vendor_menu_profiles').insert({
      vendor_id: vendor.id,
      region_key: rk,
      label: newLabel.trim() || rk,
      is_master: false,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Profile exists', description: `You already have a menu for ${rk}`, variant: 'destructive' });
      } else {
        toast({ title: 'Could not create', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Regional menu created' });
    setNewLabel('Regional menu');
    load();
  }

  async function setMaster(profileId: string) {
    if (!vendor?.id) return;
    await supabase.from('vendor_menu_profiles').update({ is_master: false }).eq('vendor_id', vendor.id);
    const { error } = await supabase.from('vendor_menu_profiles').update({ is_master: true }).eq('id', profileId);
    if (error) {
      toast({ title: 'Could not set master', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Master menu updated', description: 'Used when no exact region match exists.' });
    load();
  }

  async function copyVisibility() {
    if (!copySource || !copyTarget || copySource === copyTarget) {
      toast({ title: 'Pick two different profiles', variant: 'destructive' });
      return;
    }
    const { error: delErr } = await supabase
      .from('vendor_menu_profile_hidden_products')
      .delete()
      .eq('profile_id', copyTarget);
    if (delErr) {
      toast({ title: 'Clear failed', description: delErr.message, variant: 'destructive' });
      return;
    }
    const { data: rows } = await supabase
      .from('vendor_menu_profile_hidden_products')
      .select('product_id')
      .eq('profile_id', copySource);
    const inserts = (rows || []).map((r) => ({ profile_id: copyTarget, product_id: r.product_id as string }));
    if (inserts.length) {
      const { error: insErr } = await supabase.from('vendor_menu_profile_hidden_products').insert(inserts);
      if (insErr) {
        toast({ title: 'Copy failed', description: insErr.message, variant: 'destructive' });
        return;
      }
    }
    toast({ title: 'Visibility copied', description: `${inserts.length} hidden row(s)` });
    if (copyTarget === activeProfileId) loadHidden();
  }

  async function toggleHidden(productId: string, hide: boolean) {
    if (!activeProfileId) return;
    if (hide) {
      const { error } = await supabase
        .from('vendor_menu_profile_hidden_products')
        .insert({ profile_id: activeProfileId, product_id: productId });
      if (error) {
        toast({ title: 'Could not hide', description: error.message, variant: 'destructive' });
        return;
      }
      setHiddenSet((s) => new Set(s).add(productId));
    } else {
      await supabase
        .from('vendor_menu_profile_hidden_products')
        .delete()
        .eq('profile_id', activeProfileId)
        .eq('product_id', productId);
      setHiddenSet((s) => {
        const n = new Set(s);
        n.delete(productId);
        return n;
      });
    }
  }

  const profileOptions = useMemo(
    () => profiles.map((p) => ({ id: p.id, label: `${p.label} (${p.region_key})` })),
    [profiles]
  );

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell || !vendorsMode || !vendor) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">Link a dispensary to configure menu sources.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href={`/vendor/menu${menuVendorQuery}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to menu
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Menu source, POS & regions</h1>
          <p className="mt-2 max-w-3xl text-gray-400">
            Choose whether shoppers see your manual Treehouse catalog, POS-linked SKUs only, or both (hybrid). Connect
            cannabis POS vendors (Blaze, Dutchie, Treez, …) — live inventory sync is completed once API credentials are on
            file. Build regional menus and hide SKUs per area; set a master profile as the fallback when a listing’s state
            doesn’t match a specific profile.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>
          <div className="space-y-8 lg:col-span-3">
            {loading ? (
              <Loader2 className="h-10 w-10 animate-spin text-brand-lime" />
            ) : (
              <>
                <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                  <h2 className="mb-2 text-xl font-semibold text-white">Public menu source</h2>
                  <p className="mb-4 text-sm text-gray-500">
                    <span className="text-gray-300">Manual</span> — products you manage here.{' '}
                    <span className="text-gray-300">POS</span> — only items linked to a POS row (
                    <code className="text-green-400/90">pos_external_id</code>).{' '}
                    <span className="text-gray-300">Hybrid</span> — same catalog; use hidden toggles below to trim per
                    region.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select value={mode} onValueChange={(v) => setMode(v as MenuSourceMode)}>
                      <SelectTrigger className="w-full border-green-900/30 bg-gray-950 text-white sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                        <SelectItem value="manual">Manual menu</SelectItem>
                        <SelectItem value="pos">POS menu only</SelectItem>
                        <SelectItem value="hybrid">Hybrid (manual + POS rows)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      disabled={savingMode}
                      onClick={saveMenuMode}
                    >
                      {savingMode ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save source'}
                    </Button>
                  </div>
                </Card>

                <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-green-400" />
                    <h2 className="text-xl font-semibold text-white">POS integrations</h2>
                  </div>
                  <p className="mb-4 text-sm text-gray-500">
                    Register a provider, then <strong className="text-gray-300">Sync</strong> records a timestamp. Full
                    OAuth and catalog workers ship per-provider; store secrets in Supabase Vault or your secrets manager —
                    never in client-side code.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {POS_PROVIDER_OPTIONS.map((p) => {
                      const row = conns.find((c) => c.provider === p.id);
                      return (
                        <div
                          key={p.id}
                          className="flex flex-col gap-2 rounded-lg border border-green-900/25 bg-black/30 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-white">{p.label}</span>
                            {row && (
                              <Badge variant="outline" className="border-gray-600 text-gray-300">
                                {row.status}
                              </Badge>
                            )}
                          </div>
                          {row?.last_sync_at && (
                            <p className="text-xs text-gray-500">Last sync: {new Date(row.last_sync_at).toLocaleString()}</p>
                          )}
                          <div className="mt-auto flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="bg-gray-800 text-white"
                              onClick={() => addConnection(p.id)}
                            >
                              Register
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-green-700 hover:bg-green-600"
                              disabled={syncing === p.id}
                              onClick={() => runSync(p.id)}
                            >
                              {syncing === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1 h-4 w-4" />
                              )}
                              Sync
                            </Button>
                            {p.docsUrl ? (
                              <a
                                href={p.docsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-green-400 hover:underline"
                              >
                                Provider site
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-amber-400" />
                    <h2 className="text-xl font-semibold text-white">Regional menus</h2>
                  </div>
                  <p className="mb-4 text-sm text-gray-500">
                    Region keys are usually 2-letter states (e.g. CA). The storefront listing uses the shop’s state to pick
                    a profile; otherwise it falls back to the <span className="text-gray-300">master</span> profile, then{' '}
                    <code className="text-green-400/90">DEFAULT</code>.
                  </p>

                  <div className="mb-6 flex flex-wrap items-end gap-3">
                    <div>
                      <Label className="text-gray-400">Region code</Label>
                      <Input
                        value={newRegion}
                        onChange={(e) => setNewRegion(e.target.value)}
                        className="mt-1 w-28 border-green-900/30 bg-gray-950 text-white"
                        placeholder="CA"
                      />
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <Label className="text-gray-400">Label</Label>
                      <Input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="mt-1 border-green-900/30 bg-gray-950 text-white"
                      />
                    </div>
                    <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={createProfile}>
                      Add profile
                    </Button>
                  </div>

                  <ul className="mb-8 space-y-2">
                    {profiles.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-900/20 bg-black/40 px-3 py-2"
                      >
                        <div>
                          <span className="font-medium text-white">{p.label}</span>{' '}
                          <span className="text-gray-500">({p.region_key})</span>
                          {p.is_master && (
                            <Badge className="ml-2 border-amber-700/40 bg-amber-950/50 text-amber-200">Master</Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300"
                          disabled={p.is_master}
                          onClick={() => setMaster(p.id)}
                        >
                          Set as master
                        </Button>
                      </li>
                    ))}
                  </ul>

                  <h3 className="mb-2 text-lg font-medium text-white">Copy hidden items between profiles</h3>
                  <p className="mb-3 text-sm text-gray-500">
                    Copies which products are hidden on the public menu — not the products themselves.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <Label className="text-gray-400">From</Label>
                      <Select value={copySource} onValueChange={setCopySource}>
                        <SelectTrigger className="mt-1 w-[200px] border-green-900/30 bg-gray-950 text-white">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                          {profileOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-400">To</Label>
                      <Select value={copyTarget} onValueChange={setCopyTarget}>
                        <SelectTrigger className="mt-1 w-[200px] border-green-900/30 bg-gray-950 text-white">
                          <SelectValue placeholder="Target" />
                        </SelectTrigger>
                        <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                          {profileOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="secondary" className="bg-gray-800" onClick={copyVisibility}>
                      Copy visibility
                    </Button>
                  </div>
                </Card>

                <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <EyeOff className="h-5 w-5 text-red-400/90" />
                    <h2 className="text-xl font-semibold text-white">Hide items per profile (hybrid / manual)</h2>
                  </div>
                  <p className="mb-4 text-sm text-gray-500">
                    Checked = hidden from the public menu for that regional profile. POS-only mode ignores manual-only rows
                    unless they carry a POS id.
                  </p>
                  <div className="mb-4 max-w-md">
                    <Label className="text-gray-400">Edit profile</Label>
                    <Select value={activeProfileId} onValueChange={setActiveProfileId}>
                      <SelectTrigger className="mt-1 border-green-900/30 bg-gray-950 text-white">
                        <SelectValue placeholder="Choose profile" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 border-green-900/30 bg-gray-950 text-white">
                        {profileOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {loadingHidden ? (
                    <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
                  ) : (
                    <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-green-900/20 p-3">
                      {products.map((pr) => (
                        <label
                          key={pr.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-800/50"
                        >
                          <Checkbox
                            checked={hiddenSet.has(pr.id)}
                            onCheckedChange={(c) => toggleHidden(pr.id, c === true)}
                          />
                          <span className="text-sm text-gray-200">{pr.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
