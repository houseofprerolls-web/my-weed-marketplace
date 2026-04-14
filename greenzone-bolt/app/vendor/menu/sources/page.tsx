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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type ConnRow = {
  id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  config: Record<string, unknown> | null;
};

type PosFormFields = {
  storeId: string;
  apiToken: string;
  partnerApiKey: string;
  notes: string;
  baseUrl: string;
};

function emptyPosFormMap(): Record<string, PosFormFields> {
  return Object.fromEntries(
    POS_PROVIDER_OPTIONS.map((p) => [
      p.id,
      { storeId: '', apiToken: '', partnerApiKey: '', notes: '', baseUrl: '' },
    ])
  ) as Record<string, PosFormFields>;
}

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
  const [savingPosProvider, setSavingPosProvider] = useState<string | null>(null);
  const [posForm, setPosForm] = useState<Record<string, PosFormFields>>(emptyPosFormMap);

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
      supabase
        .from('vendor_pos_connections')
        .select('id,provider,status,last_sync_at,last_error,config')
        .eq('vendor_id', vendor.id),
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
    setPosForm((prev) => {
      const next = { ...prev };
      for (const c of conns) {
        const cfg = (c.config && typeof c.config === 'object' ? c.config : {}) as Record<string, unknown>;
        const keep = prev[c.provider] ?? {
          storeId: '',
          apiToken: '',
          partnerApiKey: '',
          notes: '',
          baseUrl: '',
        };
        next[c.provider] = {
          storeId: String(cfg.store_id ?? cfg.dispensary_id ?? cfg.location_id ?? keep.storeId ?? ''),
          apiToken: keep.apiToken,
          partnerApiKey: String(cfg.partner_api_key ?? keep.partnerApiKey ?? ''),
          notes: String(cfg.notes ?? cfg.note ?? keep.notes ?? ''),
          baseUrl: String(cfg.api_base_url ?? keep.baseUrl ?? ''),
        };
      }
      return next;
    });
  }, [conns]);

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

  function buildConfigFromForm(provider: string, mergeInto?: Record<string, unknown> | null): Record<string, unknown> {
    const f = posForm[provider] ?? {
      storeId: '',
      apiToken: '',
      partnerApiKey: '',
      notes: '',
      baseUrl: '',
    };
    const out: Record<string, unknown> = { ...(mergeInto && typeof mergeInto === 'object' ? mergeInto : {}) };
    if (f.storeId.trim()) out.store_id = f.storeId.trim();
    else delete out.store_id;
    if (f.notes.trim()) out.notes = f.notes.trim();
    else delete out.notes;
    if (f.apiToken.trim()) out.api_token = f.apiToken.trim();
    if (provider === 'blaze') {
      if (f.partnerApiKey.trim()) out.partner_api_key = f.partnerApiKey.trim();
      else delete out.partner_api_key;
    }
    if (provider === 'other') {
      if (f.baseUrl.trim()) out.api_base_url = f.baseUrl.trim();
      else delete out.api_base_url;
    } else {
      delete out.api_base_url;
    }
    return out;
  }

  async function saveConnectionConfig(provider: string) {
    if (!vendor?.id) return;
    setSavingPosProvider(provider);
    const row = conns.find((c) => c.provider === provider);
    const prev = (row?.config && typeof row.config === 'object' ? row.config : {}) as Record<string, unknown>;
    const next = buildConfigFromForm(provider, prev);
    if (!(posForm[provider]?.apiToken ?? '').trim()) {
      if (typeof prev.api_token === 'string' && prev.api_token.length > 0) {
        next.api_token = prev.api_token;
      } else if (typeof next.api_token !== 'string' || next.api_token.length === 0) {
        delete next.api_token;
      }
    }
    if (provider === 'blaze' && !(posForm[provider]?.partnerApiKey ?? '').trim()) {
      if (typeof prev.partner_api_key === 'string' && prev.partner_api_key.length > 0) {
        next.partner_api_key = prev.partner_api_key;
      } else if (typeof next.partner_api_key !== 'string' || next.partner_api_key.length === 0) {
        delete next.partner_api_key;
      }
    }
    if (Object.keys(next).length === 0) {
      next.note = 'POS connection from vendor dashboard — add store ID and token as needed.';
    }
    const { error } = await supabase.from('vendor_pos_connections').upsert(
      {
        vendor_id: vendor.id,
        provider,
        status:
          row?.status && row.status !== 'error' && row.status !== 'syncing' ? row.status : 'disconnected',
        config: next,
        last_error: null,
      },
      { onConflict: 'vendor_id,provider' }
    );
    setSavingPosProvider(null);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: row ? 'Connection settings saved' : 'POS connection registered',
      description: 'Shop ID and keys are stored on this connection for future Sync runs.',
    });
    setPosForm((p) => ({
      ...p,
      [provider]: {
        ...(p[provider] ?? {
          storeId: '',
          apiToken: '',
          partnerApiKey: '',
          notes: '',
          baseUrl: '',
        }),
        apiToken: '',
        partnerApiKey: '',
      },
    }));
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
      const row = conns.find((c) => c.provider === provider);
      const prevCfg = (row?.config && typeof row.config === 'object' ? row.config : {}) as Record<string, unknown>;
      const mergedConfig = buildConfigFromForm(provider, prevCfg);
      if (!(posForm[provider]?.apiToken ?? '').trim()) {
        if (typeof prevCfg.api_token === 'string' && prevCfg.api_token.length > 0) {
          mergedConfig.api_token = prevCfg.api_token;
        } else if (typeof mergedConfig.api_token !== 'string' || mergedConfig.api_token.length === 0) {
          delete mergedConfig.api_token;
        }
      }
      if (provider === 'blaze' && !(posForm[provider]?.partnerApiKey ?? '').trim()) {
        if (typeof prevCfg.partner_api_key === 'string' && prevCfg.partner_api_key.length > 0) {
          mergedConfig.partner_api_key = prevCfg.partner_api_key;
        } else if (typeof mergedConfig.partner_api_key !== 'string' || mergedConfig.partner_api_key.length === 0) {
          delete mergedConfig.partner_api_key;
        }
      }
      const res = await fetch('/api/vendor/pos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendorId: vendor.id, provider, config: mergedConfig }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast({ title: 'Sync failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      const pullEnabled = j.catalogPullEnabled === true;
      const imported = typeof j.productsImported === 'number' ? j.productsImported : 0;
      const updated = typeof j.productsUpdated === 'number' ? j.productsUpdated : 0;
      const warn =
        typeof j.warning === 'string' && j.warning.trim().length > 0 ? ` ${String(j.warning).trim()}` : '';
      if (pullEnabled && (imported > 0 || updated > 0)) {
        toast({
          title: 'Sync complete',
          description: `${j.message || `Added ${imported}, updated ${updated} product(s).`}${warn} Saved credentials stay on file for the next sync.`,
        });
      } else if (pullEnabled && imported === 0 && updated === 0) {
        toast({
          title: 'Sync finished — no products',
          description:
            (j.message ||
              'No products returned for this shop. Check Blaze Secret and Key (Advanced), optional shop ID filter, and catalog API paths.') +
            warn +
            ' Keys remain stored on your connection.',
        });
      } else {
        toast({
          title: 'Connection updated — menu not imported',
          description:
            j.message ||
            'POS catalog import did not run; your product list was not changed. Add items manually under Menu.',
        });
      }
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      toast({
        title: 'Sync failed',
        description:
          msg.includes('fetch') || msg.includes('Load failed')
            ? `${msg} If this persists, check that the app is reachable and try again.`
            : msg,
        variant: 'destructive',
      });
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell || !vendorsMode || !vendor) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">Link a dispensary to configure menu sources.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            Choose whether shoppers see your manual Treehouse catalog, POS-linked SKUs only, or both (hybrid). Blaze catalog
            sync uses your Blaze Retail <strong className="text-gray-300">Developer Keys</strong> (Secret required; Key often required too). Blaze’s URLs include{' '}
            <code className="text-gray-500">/api/v1/partner/…</code> — that is their route prefix, not a separate program you join. Other POS connectors are added over time. Build regional menus and hide SKUs per area;
            set a master profile as the fallback when a listing’s state doesn’t match a specific profile.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>
          <div className="relative min-h-[min(70vh,560px)] min-w-0 space-y-8 md:col-span-3">
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
                  <Alert className="mb-4 border-green-800/50 bg-green-950/25 text-green-100 [&>svg]:text-green-400">
                    <AlertTitle className="text-green-100">Blaze catalog import</AlertTitle>
                    <AlertDescription className="space-y-2 text-green-100/90">
                      <p>
                        Use <strong className="text-white">Blaze Retail → Global Settings → Company Settings → Developer Keys</strong> only. Sync stores your{' '}
                        <strong className="text-white">Secret</strong> first (HTTP <code className="text-white/90">Authorization</code>); add the{' '}
                        <strong className="text-white">Key</strong> under Advanced when Blaze requires it (HTTP <code className="text-white/90">x-api-key</code>).{' '}
                        <a
                          href="https://apidocs.blaze.me/getting-started/authentication"
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-green-300 underline"
                        >
                          Blaze authentication reference
                        </a>
                        . Paths default to <code className="text-white/90">GET /api/v1/partner/store</code> (probe; 404 ignored) then{' '}
                        <code className="text-white/90">GET /api/v1/partner/store/inventory/products</code> — the <code className="text-white/90">/partner/</code> segment is Blaze’s URL naming only. Override with{' '}
                        <code className="text-white/90">BLAZE_RETAILER_STORE_PATH</code> / <code className="text-white/90">BLAZE_RETAILER_PRODUCTS_PATH</code> or connection{' '}
                        <code className="text-white/90">retailer_store_path</code> / <code className="text-white/90">retailer_products_path</code> and <code className="text-white/90">api_base_url</code> if Blaze gave you different URLs.
                      </p>
                      <p className="font-medium text-green-100">Before syncing in Blaze</p>
                      <ul className="list-disc space-y-1 pl-4 text-green-100/90">
                        <li>
                          Save the <strong className="text-white">Secret</strong> (longer value); open <strong className="text-white">Advanced</strong> and save the <strong className="text-white">Key</strong> (shorter) if sync returns 401. Same Developer Keys row;{' '}
                          <strong className="text-white">Status</strong> on. Wrong column paste is auto-corrected when the Secret is longer than the Key.
                        </li>
                        <li>
                          <strong className="text-white">Key name</strong> matches your integration (e.g. Treehouse).
                        </li>
                        <li>
                          Enable the <strong className="text-white">Expose</strong> toggles Blaze requires for inventory/products (per Blaze support).
                        </li>
                        <li>
                          Leave <strong className="text-white">Shop ID</strong> blank for the first successful sync unless you are sure of the exact Blaze <code className="text-white/90">shopId</code>.
                        </li>
                      </ul>
                      <p className="text-green-100/85">
                        Dutchie, Treez, Jane, and others return &quot;not implemented&quot; until their connectors are added.
                      </p>
                    </AlertDescription>
                  </Alert>
                  <p className="mb-4 text-sm text-gray-500">
                    <strong className="text-gray-300">Save connection</strong> stores your shop ID and POS credentials in this
                    dispensary&apos;s POS connection record in the database so every <strong className="text-gray-300">Sync</strong>{' '}
                    reuses them automatically. The green <span className="text-green-400">Online</span> light appears after a
                    successful catalog sync.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {POS_PROVIDER_OPTIONS.map((p) => {
                      const row = conns.find((c) => c.provider === p.id);
                      const f = posForm[p.id] ?? {
                        storeId: '',
                        apiToken: '',
                        partnerApiKey: '',
                        notes: '',
                        baseUrl: '',
                      };
                      const cfg = (row?.config && typeof row.config === 'object' ? row.config : {}) as Record<string, unknown>;
                      const hasTokenOnFile = typeof cfg.api_token === 'string' && cfg.api_token.length > 0;
                      const hasPartnerKeyOnFile =
                        p.id === 'blaze' &&
                        typeof cfg.partner_api_key === 'string' &&
                        cfg.partner_api_key.length > 0;
                      const hasStoreIdOnFile = Boolean(
                        (typeof cfg.store_id === 'string' && cfg.store_id.length > 0) ||
                          (typeof cfg.dispensary_id === 'string' && cfg.dispensary_id.length > 0) ||
                          (typeof cfg.location_id === 'string' && cfg.location_id.length > 0)
                      );
                      const credsSavedForSync =
                        p.id === 'blaze' ? hasTokenOnFile : hasTokenOnFile || hasStoreIdOnFile;
                      const hasAnySavedCreds =
                        hasStoreIdOnFile || hasTokenOnFile || hasPartnerKeyOnFile;

                      const isActivelySyncing = syncing === p.id || row?.status === 'syncing';
                      const posCardClass = cn(
                        'relative z-0 flex flex-col gap-3 rounded-lg border p-4 transition-[border-color,box-shadow]',
                        isActivelySyncing &&
                          'border-amber-500/45 bg-amber-950/10 shadow-[0_0_20px_rgba(245,158,11,0.12)]',
                        !isActivelySyncing &&
                          row?.status === 'connected' &&
                          'border-green-500/50 bg-green-950/20 shadow-[0_0_24px_rgba(34,197,94,0.18)]',
                        !isActivelySyncing &&
                          row?.status === 'error' &&
                          'border-red-500/40 bg-red-950/10',
                        !isActivelySyncing &&
                          row?.status === 'disconnected' &&
                          credsSavedForSync &&
                          'border-sky-800/40 bg-sky-950/10',
                        !isActivelySyncing &&
                          (row?.status === 'disconnected' || !row) &&
                          !credsSavedForSync &&
                          'border-green-900/25 bg-black/30',
                      );

                      return (
                        <div key={p.id} className={posCardClass}>
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-medium text-white">{p.label}</span>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              {!row ? (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="h-2 w-2 rounded-full bg-gray-600" title="No connection row yet" />
                                  Offline
                                </div>
                              ) : isActivelySyncing ? (
                                <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                                  <span
                                    className="h-2 w-2 animate-pulse rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.85)]"
                                    title="Sync in progress"
                                  />
                                  Syncing…
                                </div>
                              ) : row.status === 'connected' ? (
                                <div className="flex items-center gap-2 text-xs font-medium text-green-400">
                                  <span
                                    className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.95)]"
                                    title="Last catalog sync succeeded"
                                  />
                                  Online · synced
                                </div>
                              ) : row.status === 'error' ? (
                                <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                                  <span className="h-2 w-2 rounded-full bg-red-500" title="Last sync failed" />
                                  Error
                                </div>
                              ) : credsSavedForSync ? (
                                <div className="flex items-center gap-2 text-xs font-medium text-sky-400/95">
                                  <span
                                    className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                                    title="Keys saved — run Sync to pull catalog"
                                  />
                                  Keys saved
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="h-2 w-2 rounded-full bg-gray-600" title="Add keys and save" />
                                  Not configured
                                </div>
                              )}
                              {row ? (
                                <Badge variant="outline" className="border-gray-600 text-[10px] uppercase text-gray-400">
                                  {row.status}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          {hasAnySavedCreds ? (
                            <div className="flex flex-wrap gap-1.5">
                              {hasStoreIdOnFile ? (
                                <Badge
                                  variant="outline"
                                  className="border-green-700/50 bg-green-950/50 text-[10px] font-normal text-green-300/95"
                                >
                                  Shop / store ID saved
                                </Badge>
                              ) : null}
                              {hasPartnerKeyOnFile ? (
                                <Badge
                                  variant="outline"
                                  className="border-green-700/50 bg-green-950/50 text-[10px] font-normal text-green-300/95"
                                >
                                  {p.id === 'blaze' ? 'Blaze Key on file' : 'Secondary key on file'}
                                </Badge>
                              ) : null}
                              {hasTokenOnFile ? (
                                <Badge
                                  variant="outline"
                                  className="border-green-700/50 bg-green-950/50 text-[10px] font-normal text-green-300/95"
                                >
                                  {p.id === 'blaze' ? 'Blaze Secret on file' : 'API key on file'}
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}

                          {row?.last_error && (
                            <p className="text-xs text-red-400/90">Last error: {String(row.last_error)}</p>
                          )}
                          {row?.last_sync_at && (
                            <p className="text-xs text-gray-500">Last sync: {new Date(row.last_sync_at).toLocaleString()}</p>
                          )}

                          <div className="space-y-2 border-t border-green-900/20 pt-3">
                            <div>
                              <Label className="text-xs text-gray-500">
                                Store / dispensary / location ID{p.id === 'blaze' ? ' (Blaze shopId — optional filter)' : ''}
                              </Label>
                              <Input
                                value={f.storeId}
                                onChange={(e) =>
                                  setPosForm((prev) => ({
                                    ...prev,
                                    [p.id]: { ...f, storeId: e.target.value },
                                  }))
                                }
                                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                                placeholder="From your POS dashboard"
                                autoComplete="off"
                              />
                            </div>
                            {p.id === 'other' && (
                              <div>
                                <Label className="text-xs text-gray-500">API base URL</Label>
                                <Input
                                  value={f.baseUrl}
                                  onChange={(e) =>
                                    setPosForm((prev) => ({
                                      ...prev,
                                      [p.id]: { ...f, baseUrl: e.target.value },
                                    }))
                                  }
                                  className="mt-1 border-green-900/30 bg-gray-950 text-white"
                                  placeholder="https://…"
                                  autoComplete="off"
                                />
                              </div>
                            )}
                            <div>
                              <Label className="text-xs text-gray-500">
                                {p.id === 'blaze'
                                  ? 'Blaze Secret (Developer Keys → Secret → Authorization header)'
                                  : 'API key / bearer token (optional)'}
                              </Label>
                              <Input
                                type="password"
                                value={f.apiToken}
                                onChange={(e) =>
                                  setPosForm((prev) => ({
                                    ...prev,
                                    [p.id]: { ...f, apiToken: e.target.value },
                                  }))
                                }
                                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                                placeholder={
                                  hasTokenOnFile
                                    ? '•••••••• leave blank to keep saved Secret'
                                    : p.id === 'blaze'
                                      ? 'Paste the Secret from Developer Keys (required)'
                                      : 'Paste token if required'
                                }
                                autoComplete="off"
                              />
                              {hasTokenOnFile && !f.apiToken ? (
                                <p className="mt-1 text-[11px] text-gray-500">
                                  {p.id === 'blaze'
                                    ? 'A Blaze Secret is already saved for this connection.'
                                    : 'A token is already saved for this provider.'}
                                </p>
                              ) : null}
                              {p.id === 'blaze' && hasTokenOnFile && !hasPartnerKeyOnFile ? (
                                <p className="mt-1 text-[11px] text-amber-200/90">
                                  Blaze usually also needs the Key from the same row for the <code className="text-amber-100/80">x-api-key</code> header. Open Advanced
                                  below if sync returns 401.
                                </p>
                              ) : null}
                            </div>
                            {p.id === 'blaze' && (
                              <details className="rounded-md border border-green-900/30 bg-gray-950/50 p-3">
                                <summary className="cursor-pointer text-xs font-medium text-green-200/95">
                                  Advanced: Blaze Key (Developer Keys → Key →{' '}
                                  <code className="text-green-300/90">x-api-key</code>)
                                </summary>
                                <div className="mt-3">
                                  <Label className="text-xs text-gray-500">Key (shorter value; optional until Blaze requires it)</Label>
                                  <Input
                                    type="password"
                                    value={f.partnerApiKey}
                                    onChange={(e) =>
                                      setPosForm((prev) => ({
                                        ...prev,
                                        [p.id]: { ...f, partnerApiKey: e.target.value },
                                      }))
                                    }
                                    className="mt-1 border-green-900/30 bg-gray-950 text-white"
                                    placeholder={
                                      hasPartnerKeyOnFile
                                        ? '•••••••• leave blank to keep saved Key'
                                        : 'Shown once in Blaze when the row was created'
                                    }
                                    autoComplete="off"
                                  />
                                  {hasPartnerKeyOnFile && !f.partnerApiKey ? (
                                    <p className="mt-1 text-[11px] text-gray-500">A Key is already saved for this connection.</p>
                                  ) : null}
                                </div>
                              </details>
                            )}
                            <div>
                              <Label className="text-xs text-gray-500">Notes (internal)</Label>
                              <Input
                                value={f.notes}
                                onChange={(e) =>
                                  setPosForm((prev) => ({
                                    ...prev,
                                    [p.id]: { ...f, notes: e.target.value },
                                  }))
                                }
                                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                                placeholder="e.g. account manager, env"
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          <div className="mt-auto flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-green-700/50 text-green-200"
                              disabled={savingPosProvider === p.id}
                              onClick={() => saveConnectionConfig(p.id)}
                            >
                              {savingPosProvider === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : row ? (
                                'Save connection'
                              ) : (
                                'Save / register'
                              )}
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
                                className="inline-flex items-center text-xs text-green-400 hover:underline"
                              >
                                Provider site
                              </a>
                            ) : null}
                          </div>
                          <p className="text-[11px] leading-snug text-gray-600">
                            Keys and shop ID live in your saved connection — Sync sends them to the server each time so the
                            menu stays up to date.
                          </p>
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
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-[2px]"
              aria-hidden="true"
            >
              <div className="mx-4 max-w-md rounded-2xl border border-green-800/50 bg-gray-950/95 px-10 py-10 text-center shadow-[0_0_48px_rgba(34,197,94,0.15)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-green-400">Coming soon</p>
                <p className="mt-4 text-xl font-semibold text-white">POS and menu source</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  This page is temporarily unavailable. Check back later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
