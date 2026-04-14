'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Code2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import VendorNav from '@/components/vendor/VendorNav';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { getSiteUrl } from '@/lib/siteUrl';
import { listingPathSegmentForVendor } from '@/lib/listingPath';
import { MENU_EMBED_ORIGIN_MAX, normalizeMenuEmbedOrigin } from '@/lib/menuEmbedOrigin';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type OriginRow = { id: string; origin: string; created_at: string };

export default function VendorEmbedMenuPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { toast } = useToast();

  const [origins, setOrigins] = useState<OriginRow[]>([]);
  const [loadingOrigins, setLoadingOrigins] = useState(true);
  const [newOrigin, setNewOrigin] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOrigins = useCallback(async () => {
    if (!vendor?.id) {
      setOrigins([]);
      setLoadingOrigins(false);
      return;
    }
    setLoadingOrigins(true);
    const { data, error } = await supabase
      .from('vendor_menu_embed_origins')
      .select('id,origin,created_at')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: true });
    if (error) {
      console.error(error);
      setOrigins([]);
      toast({ title: 'Could not load embed domains', description: error.message, variant: 'destructive' });
    } else {
      setOrigins((data || []) as OriginRow[]);
    }
    setLoadingOrigins(false);
  }, [vendor?.id, toast]);

  useEffect(() => {
    void loadOrigins();
  }, [loadOrigins]);

  const embedPath = useMemo(() => {
    if (!vendor) return '';
    const seg = listingPathSegmentForVendor({ id: vendor.id, slug: vendor.slug });
    return `/embed/menu/${encodeURIComponent(seg)}`;
  }, [vendor]);

  const iframeSnippet = useMemo(() => {
    const base = getSiteUrl();
    const src = `${base}${embedPath}`;
    return `<iframe src="${src}" width="100%" height="800" style="border:0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="Menu"></iframe>`;
  }, [embedPath]);

  async function addOrigin() {
    if (!vendor?.id) return;
    const norm = normalizeMenuEmbedOrigin(newOrigin);
    if (!norm) {
      toast({
        title: 'Invalid URL',
        description: 'Use HTTPS only, e.g. https://shop.example.com (no path after the host).',
        variant: 'destructive',
      });
      return;
    }
    if (origins.length >= MENU_EMBED_ORIGIN_MAX) {
      toast({
        title: 'Limit reached',
        description: `You can add up to ${MENU_EMBED_ORIGIN_MAX} storefront domains.`,
        variant: 'destructive',
      });
      return;
    }
    if (origins.some((o) => o.origin === norm)) {
      toast({ title: 'Already added', description: norm, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('vendor_menu_embed_origins').insert({
      vendor_id: vendor.id,
      origin: norm,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Domain added', description: `${norm} can now iframe your menu.` });
    setNewOrigin('');
    await loadOrigins();
  }

  async function removeOrigin(id: string) {
    if (!vendor?.id) return;
    const { error } = await supabase
      .from('vendor_menu_embed_origins')
      .delete()
      .eq('id', id)
      .eq('vendor_id', vendor.id);
    if (error) {
      toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Domain removed' });
    await loadOrigins();
  }

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">You need a linked dispensary to open this page.</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">
          This area requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">No dispensary linked to this account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href={vLink('/vendor/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Website menu embed</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Allow your own ecommerce site to iframe your DaTreehouse menu. Add each storefront origin (HTTPS only),
            then paste the snippet into Shopify, WordPress, or any page that accepts HTML. Checkout always opens on
            your full store page so carts work reliably.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>
          <div className="min-w-0 space-y-6 md:col-span-3">
            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <h2 className="mb-2 text-lg font-semibold text-white">Allowed storefront origins</h2>
              <p className="text-sm text-gray-400">
                Only these exact HTTPS origins may embed your menu. Wildcards are not supported. Maximum{' '}
                {MENU_EMBED_ORIGIN_MAX} domains.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Label className="text-gray-400">Storefront URL</Label>
                  <Input
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="https://shop.mybrand.com"
                    className="mt-1 border-green-900/30 bg-gray-950 text-white"
                  />
                </div>
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={saving || loadingOrigins}
                  onClick={() => void addOrigin()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add domain
                </Button>
              </div>
              {loadingOrigins ? (
                <div className="mt-6 flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
                </div>
              ) : origins.length === 0 ? (
                <p className="mt-6 text-sm text-amber-200/90">
                  No domains yet — the iframe will be blocked everywhere until you add at least one HTTPS origin
                  above.
                </p>
              ) : (
                <ul className="mt-6 space-y-2">
                  {origins.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-900/25 bg-black/40 px-3 py-2"
                    >
                      <code className="text-sm text-emerald-200/90">{o.origin}</code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-900/40 text-red-300 hover:bg-red-950/40"
                        onClick={() => void removeOrigin(o.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
                <Code2 className="h-5 w-5 text-emerald-400" aria-hidden />
                Embed code
              </h2>
              <p className="text-sm text-gray-400">
                Paste this into your site (adjust <code className="text-green-400/90">height</code> as needed). After
                adding items to the cart here, shoppers are sent to your full listing to finish checkout.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-green-900/30 bg-black/60 p-4 text-left text-xs text-gray-200">
                {iframeSnippet}
              </pre>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 bg-gray-800 text-white hover:bg-gray-700"
                onClick={() => {
                  void navigator.clipboard.writeText(iframeSnippet);
                  toast({ title: 'Copied to clipboard' });
                }}
              >
                Copy snippet
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
