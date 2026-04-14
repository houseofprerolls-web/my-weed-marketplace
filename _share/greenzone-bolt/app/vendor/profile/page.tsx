'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import VendorNav from '@/components/vendor/VendorNav';
import { Store, Upload, Loader2, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { supabase } from '@/lib/supabase';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { useToast } from '@/hooks/use-toast';

export default function VendorProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, refresh, mayEnterVendorShell } = useVendorBusiness();
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
  }, [vendor]);

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
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          name: name.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateVal.trim() || null,
          zip: zip.trim() || null,
          logo_url: logoUrl.trim() || null,
          banner_url: bannerUrl.trim() || null,
        })
        .eq('id', vendor.id);

      if (error) throw error;
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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="border-green-900/30 bg-gray-900 p-6 text-white">
          Sign in with a linked dispensary account to edit your business profile.
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Profile editing for this schema is not wired here. Use{' '}
          <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-black text-white">
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
    <div className="min-h-screen bg-black">
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>

          <div className="space-y-6 lg:col-span-3">
            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-green-600/20 p-3">
                  <ImageIcon className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Logo & cover</h2>
                  <p className="text-sm text-gray-400">Upload or paste image URLs</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm text-gray-400">Logo</p>
                  <div className="mb-2 flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-green-900/30 bg-black/40">
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
                      if (f) upload('logo', f);
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
                  <div className="mb-2 flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-green-900/30 bg-black/40">
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
                      if (f) upload('banner', f);
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
              <h2 className="mb-4 text-xl font-bold text-white">Contact & location</h2>
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
