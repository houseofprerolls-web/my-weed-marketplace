'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { useToast } from '@/hooks/use-toast';
import { extractZip5 } from '@/lib/zipUtils';
import { fetchAllSupabasePages } from '@/lib/supabasePaginate';
import { ArrowLeft, Building2, Eye, Link2, Search, UserPlus, UserCog, UserX } from 'lucide-react';

type DispensaryRow = {
  id: string;
  name: string;
  slug: string;
  zip: string | null;
  phone: string | null;
  is_live: boolean;
  license_status: string;
  is_directory_listing: boolean | null;
  user_id: string | null;
  created_at: string;
};

type ProfileHit = {
  id: string;
  email: string | null;
  full_name: string | null;
};

function VendorLinkUserPanel({
  vendorId,
  linking,
  userSearch,
  setUserSearch,
  searchProfiles,
  profileHits,
  userIdPaste,
  setUserIdPaste,
  onAssignUser,
  hitButtonLabel = 'Link',
  uuidButtonLabel = 'Link UUID',
}: {
  vendorId: string;
  linking: boolean;
  userSearch: string;
  setUserSearch: (v: string) => void;
  searchProfiles: () => void;
  profileHits: ProfileHit[];
  userIdPaste: string;
  setUserIdPaste: (v: string) => void;
  onAssignUser: (vendorId: string, userId: string) => void | Promise<void>;
  hitButtonLabel?: string;
  uuidButtonLabel?: string;
}) {
  return (
    <div className="basis-full space-y-3 border-t border-gray-800 pt-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search email or name…"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="max-w-xs border-gray-700 bg-black"
        />
        <Button type="button" variant="secondary" onClick={searchProfiles}>
          <Search className="mr-1 h-4 w-4" />
          Search
        </Button>
      </div>
      {profileHits.length > 0 && (
        <ul className="space-y-1 text-sm">
          {profileHits.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded border border-gray-800 px-2 py-1">
              <span className="truncate text-gray-300">
                {p.email ?? p.id} {p.full_name ? `· ${p.full_name}` : ''}
              </span>
              <Button size="sm" disabled={linking} onClick={() => onAssignUser(vendorId, p.id)}>
                {hitButtonLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Or paste user UUID</Label>
          <Input
            value={userIdPaste}
            onChange={(e) => setUserIdPaste(e.target.value)}
            placeholder="uuid"
            className="w-72 border-gray-700 bg-black font-mono text-xs"
          />
        </div>
        <Button disabled={linking || userIdPaste.length < 32} onClick={() => onAssignUser(vendorId, userIdPaste.trim())}>
          {uuidButtonLabel}
        </Button>
      </div>
    </div>
  );
}

export default function AdminDispensariesPage() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const vendorsMode = isVendorsSchema();

  const [allDispensaries, setAllDispensaries] = useState<DispensaryRow[]>([]);
  const [browseQuery, setBrowseQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('CA');
  const [description, setDescription] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [slug, setSlug] = useState('');
  const [goLive, setGoLive] = useState(true);
  const [contactNote, setContactNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [linkVendorId, setLinkVendorId] = useState<string | null>(null);
  const [reassignVendorId, setReassignVendorId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [profileHits, setProfileHits] = useState<ProfileHit[]>([]);
  const [userIdPaste, setUserIdPaste] = useState('');
  const [linking, setLinking] = useState(false);

  const loadAllDispensaries = useCallback(async () => {
    if (!vendorsMode) return;
    const { rows, error, truncated } = await fetchAllSupabasePages<DispensaryRow>(async (from, to) => {
      const res = await supabase
        .from('vendors')
        .select(
          'id,name,slug,zip,phone,is_live,license_status,is_directory_listing,user_id,created_at'
        )
        .order('name')
        .range(from, to);
      return { data: (res.data || []) as DispensaryRow[], error: res.error };
    });

    if (error) {
      console.error(error);
      toast({ title: 'Could not load dispensaries', description: error.message, variant: 'destructive' });
      setAllDispensaries([]);
      return;
    }
    setAllDispensaries(rows);
    if (truncated && rows.length > 0) {
      toast({
        title: 'List may be incomplete',
        description: `Loaded ${rows.length.toLocaleString()} rows before hitting the fetch safety cap.`,
        variant: 'destructive',
      });
    }
  }, [vendorsMode, toast]);

  const unclaimed = useMemo(() => {
    return allDispensaries
      .filter((v) => v.user_id == null || String(v.user_id).trim() === '')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allDispensaries]);

  const browseFiltered = useMemo(() => {
    const q = browseQuery.trim().toLowerCase();
    if (!q) return allDispensaries;
    return allDispensaries.filter((v) => {
      const blob = [v.name, v.slug, v.zip, v.phone].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [allDispensaries, browseQuery]);

  useEffect(() => {
    if (!authLoading && isAdmin && vendorsMode) {
      setLoading(true);
      loadAllDispensaries().finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAdmin, vendorsMode, loadAllDispensaries]);

  const refreshList = useCallback(() => {
    setLoading(true);
    loadAllDispensaries().finally(() => setLoading(false));
  }, [loadAllDispensaries]);

  const searchProfiles = useCallback(async () => {
    const q = userSearch.trim();
    if (q.length < 2) {
      setProfileHits([]);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(15);

    if (error) {
      toast({ title: 'User search failed', description: error.message, variant: 'destructive' });
      setProfileHits([]);
      return;
    }
    setProfileHits((data || []) as ProfileHit[]);
  }, [userSearch, toast]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const zip5 = extractZip5(zip);
    if (!zip5) {
      toast({ title: 'Invalid ZIP', description: 'Enter at least 5 digits.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_dispensary', {
        p_name: name.trim(),
        p_zip: zip5,
        p_phone: phone.trim(),
        p_city: city.trim() || null,
        p_state: stateVal.trim() || null,
        p_description: description.trim() || null,
        p_license_number: licenseNumber.trim() || null,
        p_slug: slug.trim() || null,
        p_is_live: goLive,
        p_contact_note: contactNote.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Dispensary created', description: 'You can edit it in Vendor management or link a user below.' });
      setName('');
      setZip('');
      setPhone('');
      setDescription('');
      setLicenseNumber('');
      setSlug('');
      setContactNote('');
      void loadAllDispensaries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Create failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleLink(vendorId: string, userId: string) {
    setLinking(true);
    try {
      const { error } = await supabase.rpc('admin_link_vendor_user', {
        p_vendor_id: vendorId,
        p_user_id: userId,
      });
      if (error) throw error;
      toast({ title: 'Linked', description: 'User can open the vendor dashboard for this shop.' });
      setLinkVendorId(null);
      setUserIdPaste('');
      setProfileHits([]);
      setUserSearch('');
      void loadAllDispensaries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Link failed', description: msg, variant: 'destructive' });
    } finally {
      setLinking(false);
    }
  }

  async function handleReassign(vendorId: string, userId: string) {
    setLinking(true);
    try {
      const { error } = await supabase.rpc('admin_reassign_vendor_user', {
        p_vendor_id: vendorId,
        p_new_user_id: userId,
      });
      if (error) throw error;
      toast({ title: 'Owner updated', description: 'The new user is the linked owner for this shop.' });
      setReassignVendorId(null);
      setUserIdPaste('');
      setProfileHits([]);
      setUserSearch('');
      void loadAllDispensaries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Reassign failed', description: msg, variant: 'destructive' });
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(vendorId: string) {
    if (
      !window.confirm(
        'Remove the linked owner from this shop? The row becomes unclaimed. Existing managers keep dashboard access until removed on the vendor Team page.'
      )
    ) {
      return;
    }
    setLinking(true);
    try {
      const { error } = await supabase.rpc('admin_unlink_vendor_user', { p_vendor_id: vendorId });
      if (error) throw error;
      toast({ title: 'Owner unlinked', description: 'You can link a different user or leave the shop directory-only.' });
      void loadAllDispensaries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Unlink failed', description: msg, variant: 'destructive' });
    } finally {
      setLinking(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-red-400">Access denied</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center text-gray-400">
        Enable <code className="text-brand-lime">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code> for this console.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-green-900/30 bg-gradient-to-b from-green-950/40 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Admin home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Add dispensaries (admin)</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Create shops with no login yet. Only admins can edit them until you link a user — then the owner uses the
            normal vendor dashboard. Unclaimed rows stay <Badge variant="outline">directory / admin</Badge>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild className="bg-brand-red hover:bg-brand-red-deep">
              <Link href="/admin/vendors">Open vendor management (photos, live, license)</Link>
            </Button>
            <Button type="button" variant="outline" className="border-green-600/50 text-green-400" onClick={refreshList}>
              Reload all dispensaries
            </Button>
          </div>
          {!loading && allDispensaries.length > 0 && (
            <p className="mt-3 text-sm text-gray-500">
              Loaded <span className="text-gray-300">{allDispensaries.length.toLocaleString()}</span> shop rows from the
              database (multi-page fetch so nothing is cut off at 1,000).
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl space-y-10 px-4 py-10">
        <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Building2 className="h-5 w-5 text-brand-lime" />
            New dispensary
          </h2>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Dispensary name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2">
              <Label>ZIP *</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} required className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cannabis license (LIC)</Label>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Slug (optional — auto if empty)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="border-gray-700 bg-black" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Internal contact note (optional)</Label>
              <Input value={contactNote} onChange={(e) => setContactNote(e.target.value)} className="border-gray-700 bg-black" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={goLive} onChange={(e) => setGoLive(e.target.checked)} className="rounded border-gray-600" />
              <span className="text-sm text-gray-300">Live + approved on create (trusted admin entry)</span>
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="bg-brand-lime text-black hover:bg-brand-lime-soft">
                {saving ? 'Creating…' : 'Create dispensary'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-6">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold">
            <UserPlus className="h-5 w-5 text-brand-lime" />
            Unclaimed shops — link a user
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            Pulled from the full dispensary list (same load as below). After linking, the user gets the vendor role and
            full vendor dashboard. User search needs <code className="text-gray-300">profiles.email</code> filled (or
            paste Auth user UUID).
          </p>
          {unclaimed.length === 0 ? (
            <p className="text-gray-500">No unclaimed vendors (every row has a user_id), or list is still empty.</p>
          ) : (
            <ul className="space-y-3">
              {unclaimed.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{v.name}</p>
                    <p className="text-xs text-gray-500">
                      {v.slug} · ZIP {v.zip ?? '—'} · {v.is_live ? 'Live' : 'Not live'} · {v.license_status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="border-gray-600">
                      <Link href={`/admin/vendors?vendor=${v.id}`}>Edit in vendor admin</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-brand-red"
                      onClick={() => {
                        setReassignVendorId(null);
                        setLinkVendorId(linkVendorId === v.id ? null : v.id);
                      }}
                    >
                      <Link2 className="mr-1 h-4 w-4" />
                      Link user
                    </Button>
                  </div>
                  {linkVendorId === v.id && (
                    <VendorLinkUserPanel
                      vendorId={v.id}
                      linking={linking}
                      userSearch={userSearch}
                      setUserSearch={setUserSearch}
                      searchProfiles={searchProfiles}
                      profileHits={profileHits}
                      userIdPaste={userIdPaste}
                      setUserIdPaste={setUserIdPaste}
                      onAssignUser={handleLink}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-6">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold">
            <Search className="h-5 w-5 text-brand-lime" />
            Every dispensary in the system
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            Search by name, slug, ZIP, or phone. This list includes claimed and unclaimed rows — same data as vendor
            admin, loaded in pages so PostgREST does not drop shops past the first 1,000.
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Filter… e.g. Desert, 90003, slug"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              className="max-w-md border-gray-700 bg-black"
            />
            <span className="text-sm text-gray-500">
              Showing {browseFiltered.length.toLocaleString()} of {allDispensaries.length.toLocaleString()}
            </span>
          </div>
          <div className="max-h-[min(70vh,720px)] overflow-y-auto rounded-lg border border-gray-800">
            <ul className="divide-y divide-gray-800">
              {browseFiltered.map((v) => {
                const claimed = v.user_id != null && String(v.user_id).trim() !== '';
                return (
                  <li
                    key={v.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{v.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {v.slug} · ZIP {v.zip ?? '—'} · {v.is_live ? 'Live' : 'Not live'} · {v.license_status}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant="outline" className={claimed ? 'border-green-600/40 text-green-400' : 'border-amber-600/40 text-amber-200'}>
                        {claimed ? 'Linked owner' : 'Unclaimed'}
                      </Badge>
                      <Button asChild size="sm" variant="outline" className="border-gray-600">
                        <Link href={`/admin/vendors?vendor=${v.id}`}>Vendor admin</Link>
                      </Button>
                      {claimed && (
                        <Button asChild size="sm" variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                          <Link href={`/listing/${v.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View homepage
                          </Link>
                        </Button>
                      )}
                      {!claimed && (
                        <Button
                          size="sm"
                          className="bg-brand-red"
                          onClick={() => {
                            setReassignVendorId(null);
                            setLinkVendorId(linkVendorId === v.id ? null : v.id);
                          }}
                        >
                          <Link2 className="mr-1 h-4 w-4" />
                          Link user
                        </Button>
                      )}
                      {claimed && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-700/50 text-amber-200"
                            disabled={linking}
                            onClick={() => handleUnlink(v.id)}
                          >
                            <UserX className="mr-1 h-4 w-4" />
                            Unlink owner
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="border-gray-600"
                            onClick={() => {
                              setLinkVendorId(null);
                              setReassignVendorId(reassignVendorId === v.id ? null : v.id);
                            }}
                          >
                            <UserCog className="mr-1 h-4 w-4" />
                            Change owner
                          </Button>
                        </>
                      )}
                    </div>
                    {linkVendorId === v.id && !claimed && (
                      <VendorLinkUserPanel
                        vendorId={v.id}
                        linking={linking}
                        userSearch={userSearch}
                        setUserSearch={setUserSearch}
                        searchProfiles={searchProfiles}
                        profileHits={profileHits}
                        userIdPaste={userIdPaste}
                        setUserIdPaste={setUserIdPaste}
                        onAssignUser={handleLink}
                      />
                    )}
                    {reassignVendorId === v.id && claimed && (
                      <VendorLinkUserPanel
                        vendorId={v.id}
                        linking={linking}
                        userSearch={userSearch}
                        setUserSearch={setUserSearch}
                        searchProfiles={searchProfiles}
                        profileHits={profileHits}
                        userIdPaste={userIdPaste}
                        setUserIdPaste={setUserIdPaste}
                        onAssignUser={handleReassign}
                        hitButtonLabel="Set owner"
                        uuidButtonLabel="Set owner (UUID)"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            {browseFiltered.length === 0 && (
              <p className="p-6 text-center text-gray-500">No rows match this filter.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
