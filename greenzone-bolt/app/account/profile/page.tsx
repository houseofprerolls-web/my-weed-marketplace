'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, LogOut, Upload, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadCustomerIdDocumentFile } from '@/lib/customerIdMediaUpload';

function displayRole(role: string | null | undefined): string {
  if (!role) return '—';
  if (role === 'consumer') return 'Customer';
  if (role === 'customer') return 'Customer';
  if (role === 'vendor') return 'Vendor';
  if (role === 'admin') return 'Admin';
  if (role === 'admin_jr') return 'Junior admin';
  return role;
}

export default function AccountProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [idDocType, setIdDocType] = useState<'government_id' | 'passport' | 'photo_id'>('government_id');
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [idUploading, setIdUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setCity(profile.city ?? '');
    setZipCode(profile.zip_code ?? '');
    setBio(profile.bio ?? '');
    setAvatarUrl(profile.avatar_url ?? '');
    setIdDocType((profile.id_document_type as typeof idDocType) || 'government_id');
    setIdDocUrl(profile.id_document_url ?? null);
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const bioValue = bio.trim() === '' ? null : bio.trim();

      const { error } = await supabase.rpc('customer_update_profile', {
        p_user_id: user.id,
        p_full_name: fullName.trim() || null,
        p_phone: phone.trim() || null,
        p_city: city.trim() || null,
        p_zip_code: zipCode.trim() || null,
        p_avatar_url: avatarUrl.trim() || null,
        p_bio: bioValue,
      });
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Profile saved', description: 'Your account details were updated.' });
    } catch (err) {
      toast({
        title: 'Could not save',
        description: formatSupabaseError(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleIdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user?.id) return;
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB.', variant: 'destructive' });
      return;
    }

    setIdUploading(true);
    try {
      const res = await uploadCustomerIdDocumentFile(user.id, file, idDocType);
      if ('error' in res) throw new Error(res.error);

      const { error } = await supabase.rpc('customer_set_id_document', {
        p_id_document_url: res.url,
        p_id_document_type: idDocType,
      });
      if (error) throw error;

      setIdDocUrl(res.url);
      await refreshProfile();
      toast({ title: 'ID uploaded', description: 'Your photo will be attached to future orders.' });
    } catch (err: unknown) {
      const msg = formatSupabaseError(err);
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setIdUploading(false);
      e.target.value = '';
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-green-500" />
      </div>
    );
  }

  const email = user.email ?? profile?.email ?? '—';

  return (
    <div className="min-h-screen bg-background py-12 text-white">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" asChild className="w-fit text-gray-400 hover:text-white">
            <Link href="/account">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to account
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-brand-red/40 text-gray-200 hover:bg-brand-red/10"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold">Profile</h1>
        <p className="mb-8 text-gray-400">Update how you appear on DaTreehouse and how we can reach you.</p>

        <Card className="border-green-900/25 bg-gray-900/80 p-6">
          <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-green-900/20 pb-6">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-white">{email}</p>
            </div>
            {profile?.username ? (
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium text-white">
                  <Link
                    href={`/profile/${encodeURIComponent(profile.username)}`}
                    className="text-green-400 hover:underline"
                  >
                    @{profile.username}
                  </Link>
                </p>
                <p className="text-xs text-gray-500">Shown on the feed, reviews, and your public profile.</p>
              </div>
            ) : null}
            <Badge variant="outline" className="border-green-700/40 text-green-400/90">
              {displayRole(profile?.role)}
            </Badge>
          </div>

          <div className="mb-6 border-b border-green-900/20 pb-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Identity verification</h2>
                <p className="text-sm text-gray-400">Upload once to attach your photo to future orders.</p>
              </div>
              {profile?.id_document_url ? (
                <Badge variant="outline" className="border-green-700/40 text-green-400/90">
                  {profile.id_verified ? 'Verified' : 'Uploaded'}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-gray-600 text-gray-400">
                  Required
                </Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Select value={idDocType} onValueChange={(v) => setIdDocType(v as typeof idDocType)}>
                  <SelectTrigger className="border-green-900/30 bg-background text-foreground">
                    <SelectValue placeholder="Document type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 text-white">
                    <SelectItem value="government_id">Government ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="photo_id">Photo ID</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label htmlFor="id_document_upload" className="text-gray-300">
                    Upload document
                  </Label>
                  <input
                    id="id_document_upload"
                    type="file"
                    accept="image/*,.pdf"
                    className="block w-full text-sm text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-green-700 file:px-2 file:py-1 file:text-white"
                    onChange={handleIdFileChange}
                    disabled={idUploading}
                  />
                  <p className="text-xs text-gray-500">Max 10MB. Clear, readable photo.</p>
                </div>
              </div>

              <div>
                {idDocUrl ? (
                  <div className="rounded-lg border border-green-900/30 bg-black/40 p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-green-600/20 p-2">
                        <ShieldCheck className="h-5 w-5 text-green-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{idDocType.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-400 break-all">
                          {profile?.id_document_uploaded_at
                            ? `Uploaded ${new Date(profile.id_document_uploaded_at).toLocaleDateString()}`
                            : 'Uploaded'}
                        </p>
                        <a
                          href={idDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex w-full justify-center rounded-md border border-green-700/40 bg-green-600/10 px-3 py-2 text-sm font-semibold text-green-300 hover:bg-green-600/20"
                        >
                          View uploaded ID
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-700 bg-black/30 p-6 text-center text-sm text-gray-400">
                    Upload your ID to attach it to orders.
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <Label htmlFor="full_name" className="text-gray-300">
                Full name
              </Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 border-green-900/30 bg-background text-foreground"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-300">
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 border-green-900/30 bg-background text-foreground"
                placeholder="(555) 000-0000"
                autoComplete="tel"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city" className="text-gray-300">
                  City
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 border-green-900/30 bg-background text-foreground"
                  placeholder="City"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <Label htmlFor="zip" className="text-gray-300">
                  ZIP / postal code
                </Label>
                <Input
                  id="zip"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="mt-1 border-green-900/30 bg-background text-foreground"
                  placeholder="94103"
                  autoComplete="postal-code"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="avatar" className="text-gray-300">
                Avatar image URL
              </Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="mt-1 border-green-900/30 bg-background text-foreground"
                placeholder="https://…"
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-gray-300">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 min-h-[100px] border-green-900/30 bg-background text-foreground"
                placeholder="A short line about you (optional)."
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
