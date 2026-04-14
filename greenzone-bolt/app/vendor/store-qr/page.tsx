'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Download, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import VendorNav from '@/components/vendor/VendorNav';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { getSiteUrl } from '@/lib/siteUrl';
import { listingHrefForVendor, listingPathSegmentForVendor } from '@/lib/listingPath';
import { useToast } from '@/hooks/use-toast';
import { publicVendorDisplayName } from '@/lib/vendorDisplayName';

type LinkKind = 'listing' | 'menu_embed';

function buildPublicUrl(site: string, path: string, queryOrSuffix: string): string {
  const base = site.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const raw = queryOrSuffix.trim();
  if (!raw) return `${base}${p}`;
  const q = raw.startsWith('?') ? raw : raw.startsWith('&') ? `?${raw.slice(1)}` : `?${raw}`;
  return `${base}${p}${q}`;
}

export default function VendorStoreQrPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { toast } = useToast();

  const [linkKind, setLinkKind] = useState<LinkKind>('listing');
  const [promoQuery, setPromoQuery] = useState('');
  const [qrSize, setQrSize] = useState(320);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const site = useMemo(() => getSiteUrl(), []);

  const menuEmbedPath = useMemo(() => {
    if (!vendor) return '';
    const seg = listingPathSegmentForVendor({ id: vendor.id, slug: vendor.slug });
    return `/embed/menu/${encodeURIComponent(seg)}`;
  }, [vendor]);

  const targetUrl = useMemo(() => {
    if (!vendor) return '';
    const path = linkKind === 'listing' ? listingHrefForVendor(vendor) : menuEmbedPath;
    return buildPublicUrl(site, path, promoQuery);
  }, [vendor, site, linkKind, menuEmbedPath, promoQuery]);

  const fileSlug = useMemo(() => {
    if (!vendor) return 'store';
    return listingPathSegmentForVendor({ id: vendor.id, slug: vendor.slug }).replace(/[^\w.-]+/g, '-');
  }, [vendor]);

  const renderQr = useCallback(async () => {
    if (!targetUrl) {
      setDataUrl(null);
      return;
    }
    setQrLoading(true);
    try {
      const QR = (await import('qrcode')).default;
      const url = await QR.toDataURL(targetUrl, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0a0a0a', light: '#ffffff' },
      });
      setDataUrl(url);
    } catch (e) {
      console.error(e);
      setDataUrl(null);
      toast({
        title: 'Could not build QR code',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setQrLoading(false);
    }
  }, [targetUrl, qrSize, toast]);

  useEffect(() => {
    void renderQr();
  }, [renderQr]);

  async function copyLink() {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      toast({ title: 'Link copied', description: 'Paste it anywhere you promote the store.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select the URL and copy manually.', variant: 'destructive' });
    }
  }

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">Sign in as a vendor to manage QR codes.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Store QR is not available for this schema. Use{' '}
          <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <VendorNav />
          <Card className="mx-auto mt-8 max-w-lg border-green-900/30 bg-gray-900 p-8 text-center">
            <p className="text-gray-300">No dispensary linked to your account.</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link href={vLink('/vendor/onboarding')}>Vendor onboarding</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const displayName = publicVendorDisplayName(vendor.name);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <VendorNav />
      <main className="flex-1 overflow-auto bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl flex items-center gap-2">
              <QrCode className="h-8 w-8 text-primary" aria-hidden />
              Store QR codes
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Download a QR for flyers, posters, counter cards, or social. Scans go to your public DaTreehouse link on
              production ({site}).
            </p>
          </div>

          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>What should the QR open?</Label>
              <RadioGroup
                value={linkKind}
                onValueChange={(v) => setLinkKind(v as LinkKind)}
                className="grid gap-3 sm:grid-cols-2"
              >
                <label
                  htmlFor="qr-listing"
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    linkKind === 'listing' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <RadioGroupItem value="listing" id="qr-listing" className="mt-1" />
                  <span>
                    <span className="font-medium block">Store listing</span>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Full storefront page (hours, reviews, menu entry).
                    </span>
                  </span>
                </label>
                <label
                  htmlFor="qr-menu"
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    linkKind === 'menu_embed' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <RadioGroupItem value="menu_embed" id="qr-menu" className="mt-1" />
                  <span>
                    <span className="font-medium block">Online menu only</span>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Same embeddable menu view as Website embed (good for table tents).
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-query">Promo tracking (optional)</Label>
              <Input
                id="promo-query"
                placeholder="?ref=flyer or ?utm_source=instagram"
                value={promoQuery}
                onChange={(e) => setPromoQuery(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Adds query parameters so you can tell campaigns apart in your analytics tools.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Image size (pixels)</Label>
              <div className="flex flex-wrap gap-2">
                {[256, 320, 512, 768].map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={qrSize === s ? 'default' : 'outline'}
                    onClick={() => setQrSize(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target URL</div>
              <p className="break-all font-mono text-sm">{targetUrl || '—'}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void copyLink()}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy link
                </Button>
                {dataUrl ? (
                  <Button type="button" size="sm" asChild>
                    <a href={dataUrl} download={`${fileSlug}-qr-${qrSize}.png`}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PNG
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border bg-white p-6 dark:bg-zinc-950">
              {qrLoading ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
                <img src={dataUrl} alt={`QR code for ${displayName}`} width={qrSize} height={qrSize} className="max-w-full h-auto" />
              ) : (
                <p className="text-sm text-muted-foreground">Could not render QR.</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Preview for <span className="font-medium text-foreground">{displayName}</span>. Print at full size for
              reliable scans; leave quiet space around the code on physical pieces.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
