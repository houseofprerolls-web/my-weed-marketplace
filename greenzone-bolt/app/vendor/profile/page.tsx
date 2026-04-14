'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import VendorNav from '@/components/vendor/VendorNav';
import { Store, Upload, Loader2, ImageIcon, Truck, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { supabase } from '@/lib/supabase';
import { haversineKm } from '@/lib/discoverSort';
import { mapboxForwardGeocode, mapboxTokenForGeocode } from '@/lib/mapboxGeocode';
import { parseVendorLocationToLatLng } from '@/lib/parseVendorLocation';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { publicVendorDisplayName } from '@/lib/vendorDisplayName';
import { VendorBusinessHoursPanel } from '@/components/vendor/VendorBusinessHoursPanel';
import { VendorImageFitDialog } from '@/components/vendor/VendorImageFitDialog';
import { hasFullStoreAddress } from '@/lib/vendorStorefrontDelivery';

function parseVendorDeliveryFeeDollars(raw: unknown): number {
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 999);
}

export default function VendorProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, refresh, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [zip, setZip] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [socialEquityBadge, setSocialEquityBadge] = useState(false);
  const [equitySaving, setEquitySaving] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [offersStorefront, setOffersStorefront] = useState(false);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [allowBothLanes, setAllowBothLanes] = useState(false);

  const [fitOpen, setFitOpen] = useState(false);
  const [fitSrc, setFitSrc] = useState<string | null>(null);
  const [fitField, setFitField] = useState<'logo' | 'banner' | null>(null);
  const [fitFileName, setFitFileName] = useState('');

  function openImageFit(field: 'logo' | 'banner', file: File) {
    setFitSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFitField(field);
    setFitFileName(file.name);
    setFitOpen(true);
  }

  function onFitOpenChange(open: boolean) {
    setFitOpen(open);
    if (!open) {
      setFitSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setFitField(null);
      setFitFileName('');
    }
  }

  useEffect(() => {
    if (!vendor) return;
    setName(vendor.name);
    setTagline(vendor.tagline || '');
    setDescription(vendor.description || '');
    setPhone(vendor.phone || '');
    setWebsite(vendor.website || '');
    setAddress(vendor.address || '');
    setCity(vendor.city || '');
    setStateVal(vendor.state || '');
    setZip(vendor.zip || '');
    setLogoUrl(vendor.logo_url || '');
    setBannerUrl(vendor.banner_url || '');
    setSocialEquityBadge(vendor.social_equity_badge_visible === true);
    setDeliveryFee(String(parseVendorDeliveryFeeDollars(vendor.delivery_fee)));
    setOffersStorefront(vendor.offers_storefront === true);
    setOffersDelivery(vendor.offers_delivery === true);
    setAllowBothLanes(vendor.allow_both_storefront_and_delivery === true);
  }, [vendor]);

  async function setSocialEquityBadgeVisible(next: boolean) {
    if (!vendor?.id) return;
    setEquitySaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ social_equity_badge_visible: next })
        .eq('id', vendor.id);
      if (error) throw error;
      setSocialEquityBadge(next);
      toast({
        title: next ? 'Social equity badge is on' : 'Social equity badge is off',
        description: next
          ? 'Customers will see the badge on your listing, discover, and map.'
          : 'The badge is hidden until you turn it on again.',
      });
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Update failed', description: msg, variant: 'destructive' });
    } finally {
      setEquitySaving(false);
    }
  }

  async function upload(field: 'logo' | 'banner', file: File) {
    if (!user?.id) return;
    const res = await uploadVendorMediaFile(user.id, file);
    if ('error' in res) {
      toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
      return;
    }
    if (field === 'logo') setLogoUrl(res.url);
    else setBannerUrl(res.url);
    toast({ title: 'Uploaded', description: 'Save changes to publish on your listing.' });
  }

  async function handleSave() {
    if (!vendor?.id) return;
    const cleanName = publicVendorDisplayName(name.trim());
    if (!cleanName) {
      toast({
        title: 'Business name required',
        description: 'Enter a store name before saving.',
        variant: 'destructive',
      });
      return;
    }
    const rawFee =
      deliveryFee.trim() === ''
        ? 0
        : Number.parseFloat(deliveryFee.replace(/[^0-9.]/g, ''));
    const feeDollars = parseVendorDeliveryFeeDollars(Number.isFinite(rawFee) ? rawFee : 0);

    const addrPayload = {
      address: address.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,
      zip: zip.trim() || null,
    };
    const full = hasFullStoreAddress({
      address: addrPayload.address,
      city: addrPayload.city,
      state: addrPayload.state,
    });
    let nextStorefront = offersStorefront && full;
    let nextDelivery = offersDelivery;
    let nextAllowBoth = allowBothLanes && full;
    if (!full) {
      nextStorefront = false;
      nextDelivery = true;
      nextAllowBoth = false;
    } else if (!nextAllowBoth && nextStorefront && nextDelivery) {
      toast({
        title: 'Allow both lanes',
        description: 'Turn on “Delivery + storefront” below, or pick only storefront or only delivery.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    } else if (!nextStorefront && !nextDelivery) {
      toast({
        title: 'Choose how you serve customers',
        description: 'Turn on storefront, delivery, or enable both lanes.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          name: cleanName,
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          ...addrPayload,
          logo_url: logoUrl.trim() || null,
          banner_url: bannerUrl.trim() || null,
          delivery_fee: feeDollars,
          offers_storefront: nextStorefront,
          offers_delivery: nextDelivery,
          allow_both_storefront_and_delivery: nextAllowBoth,
        })
        .eq('id', vendor.id);

      if (error) throw error;

      const token = mapboxTokenForGeocode();
      if (full && token) {
        const q = [addrPayload.address, addrPayload.city, addrPayload.state, addrPayload.zip]
          .filter((p): p is string => Boolean(p && String(p).trim()))
          .join(', ');
        const hit = await mapboxForwardGeocode(q, token);
        if (hit) {
          const cur = parseVendorLocationToLatLng(vendor.location);
          const km = cur ? haversineKm(cur.lat, cur.lng, hit.lat, hit.lng) : Number.POSITIVE_INFINITY;
          if (!cur || km > 30) {
            const { error: locErr } = await supabase
              .from('vendors')
              .update({
                location: { type: 'Point', coordinates: [hit.lng, hit.lat] },
              })
              .eq('id', vendor.id);
            if (!locErr && km > 30) {
              toast({
                title: 'Profile saved',
                description:
                  'Public map coordinates were far from this address; we updated the pin to match. Fine-tune on Map location.',
              });
              refresh();
              return;
            }
          }
        }
      }

      toast({ title: 'Profile saved' });
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="border-green-900/30 bg-gray-900 p-6 text-white">
          Sign in with a linked dispensary account to edit your business profile.
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Profile editing for this schema is not wired here. Use{' '}
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
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorImageFitDialog
        open={fitOpen}
        onOpenChange={onFitOpenChange}
        imageSrc={fitSrc}
        aspect={fitField === 'banner' ? 16 / 9 : 1}
        title={fitField === 'banner' ? 'Position cover photo' : 'Position logo'}
        description={
          fitField === 'banner'
            ? 'Frame the 16×9 area used on your listing header and Smokers Club card (when no club-only backdrop is set).'
            : 'Square crop — drag and zoom so your mark is centered.'
        }
        maxOutputLongEdge={fitField === 'banner' ? 2400 : 1024}
        outputBaseName={fitFileName}
        onApply={async (file) => {
          if (fitField === 'logo') await upload('logo', file);
          else if (fitField === 'banner') await upload('banner', file);
        }}
      />
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Business profile</h1>
            <div className="flex gap-2">
              {vendor.verified && (
                <Badge className="border-green-600/30 bg-green-600/20 text-green-500">Verified</Badge>
              )}
              <Badge variant="outline" className="border-gray-600 text-gray-400">
                {vendor.is_live ? 'Live' : 'Not live'}
              </Badge>
            </div>
          </div>
          <p className="text-gray-400">Updates apply to your public dispensary listing ({vendor.slug})</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>

          <div className="min-w-0 space-y-6 md:col-span-3">
            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-green-600/20 p-3">
                  <ImageIcon className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Logo & cover</h2>
                  <p className="text-sm text-gray-400">Upload (adjust position &amp; zoom) or paste image URLs</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm text-gray-400">Logo</p>
                  <div className="mb-2 flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg bg-background">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-gray-600">No logo</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="mb-2 block w-full text-sm text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-green-700 file:px-2 file:py-1 file:text-white"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) openImageFit('logo', f);
                      e.target.value = '';
                    }}
                  />
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="border-green-900/20 bg-gray-800 text-white"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm text-gray-400">Banner</p>
                  <div className="mb-2 flex h-28 w-full items-center justify-center overflow-hidden rounded-lg bg-background">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-gray-600">No banner</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="mb-2 block w-full text-sm text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-green-700 file:px-2 file:py-1 file:text-white"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) openImageFit('banner', f);
                      e.target.value = '';
                    }}
                  />
                  <Input
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://..."
                    className="border-green-900/20 bg-gray-800 text-white"
                  />
                </div>
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-green-600/20 p-3">
                  <Store className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Basics</h2>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block font-semibold text-white">Business name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Don&apos;t add &quot;equity retailer&quot; to the name — use the Social equity toggle below for the
                    public badge.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block font-semibold text-white">Tagline</label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                </div>
                <div>
                  <label className="mb-2 block font-semibold text-white">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="border-green-900/20 bg-gray-800 text-white"
                  />
                </div>
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <h2 className="mb-2 text-xl font-bold text-white">Social equity program</h2>
              <p className="mb-4 text-sm text-gray-400">
                Show a <span className="text-gray-300">Social equity</span> badge on your public listing, discover cards,
                map, and deals. Your store name stays clean; only the badge signals participation.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-gray-300">Show Social equity badge to customers</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{socialEquityBadge ? 'On' : 'Off'}</span>
                  <Switch
                    checked={socialEquityBadge}
                    onCheckedChange={(c) => setSocialEquityBadgeVisible(c === true)}
                    disabled={equitySaving}
                  />
                </div>
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-green-600/20 p-3">
                  <MapPin className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Storefront &amp; delivery</h2>
                  <p className="text-sm text-gray-400">
                    Default is one lane: storefront <span className="text-gray-500">or</span> delivery. Turn on{' '}
                    <span className="text-gray-300">Delivery + storefront</span> only if you truly operate both. Without a
                    full street address, the public listing stays <span className="text-gray-300">delivery-style</span>{' '}
                    (no storefront address).
                  </p>
                </div>
              </div>
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Delivery + storefront</p>
                    <p className="text-xs text-gray-500">
                      Allow both options at once. Required before you can turn on delivery and storefront together.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{allowBothLanes ? 'On' : 'Off'}</span>
                    <Switch
                      checked={allowBothLanes}
                      disabled={!hasFullStoreAddress({ address, city, state: stateVal })}
                      onCheckedChange={(c) => {
                        const on = c === true;
                        setAllowBothLanes(on);
                        if (!on && offersDelivery && offersStorefront) {
                          setOffersDelivery(false);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Storefront / pickup</p>
                    <p className="text-xs text-gray-500">
                      {hasFullStoreAddress({ address, city, state: stateVal })
                        ? 'In-store shopping or pickup at the address below.'
                        : 'Add street, city, and state under Contact & location to enable.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{offersStorefront ? 'On' : 'Off'}</span>
                    <Switch
                      checked={offersStorefront}
                      disabled={!hasFullStoreAddress({ address, city, state: stateVal })}
                      onCheckedChange={(c) => {
                        const on = c === true;
                        if (on && offersDelivery && !allowBothLanes) setOffersDelivery(false);
                        setOffersStorefront(on);
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Delivery</p>
                    <p className="text-xs text-gray-500">Cannabis delivery to customers in your service area.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{offersDelivery ? 'On' : 'Off'}</span>
                    <Switch
                      checked={offersDelivery}
                      onCheckedChange={(c) => {
                        const on = c === true;
                        if (on && offersStorefront && !allowBothLanes) setOffersStorefront(false);
                        setOffersDelivery(on);
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {offersDelivery ? (
              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-lg bg-green-600/20 p-3">
                    <Truck className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Delivery fee</h2>
                    <p className="text-sm text-gray-400">
                      Flat fee added at checkout for delivery or curbside (pickup has no delivery fee).
                    </p>
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="mb-2 block text-sm font-medium text-white" htmlFor="delivery-fee">
                    Fee (USD)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="delivery-fee"
                      inputMode="decimal"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      placeholder="0.00"
                      className="border-green-900/20 bg-gray-800 pl-7 text-white"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Use 0 for free delivery. Max $999.</p>
                </div>
              </Card>
            ) : null}

            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Contact &amp; location</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-white">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-white">Website</label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-white">Street</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-white">City</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-white">State</label>
                  <Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-white">ZIP</label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} className="border-green-900/20 bg-gray-800 text-white" />
                </div>
              </div>
            </Card>

            <Card
              id="business-hours"
              className="scroll-mt-28 border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6 lg:scroll-mt-8"
            >
              <h2 className="mb-2 text-xl font-bold text-white">Business hours</h2>
              <VendorBusinessHoursPanel vendorId={vendor?.id} />
            </Card>

            <div className="flex justify-end gap-3">
              <Button disabled={saving} onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
