'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import { useRouter } from 'next/navigation';

type SupplyAccount = {
  id: string;
  name: string;
  slug: string;
  account_type: string;
  brand_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_published: boolean;
};

type BrandRow = { id: string; name: string };

type ProfileHit = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
};

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'supply';
}

function profileLabel(p: Pick<ProfileHit, 'email' | 'username' | 'full_name' | 'id'>): string {
  const bits = [p.full_name, p.username, p.email].filter(Boolean);
  return bits.length ? bits.join(' · ') : p.id;
}

export default function AdminSupplyPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const router = useRouter();
  const { toast } = useToast();
  const assignSectionRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<SupplyAccount[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [accountType, setAccountType] = useState<'brand' | 'distributor'>('distributor');
  const [brandId, setBrandId] = useState<string>('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const [memberSupplyId, setMemberSupplyId] = useState('');
  const [memberRole, setMemberRole] = useState<'owner' | 'editor'>('editor');
  const [userSearch, setUserSearch] = useState('');
  const [userSearchDebounced, setUserSearchDebounced] = useState('');
  const [userHits, setUserHits] = useState<ProfileHit[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileHit | null>(null);
  const [memberUserIdPaste, setMemberUserIdPaste] = useState('');
  const [showUuidPaste, setShowUuidPaste] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('supply_accounts').select('*').order('name'),
      supabase.from('brands').select('id,name').order('name').limit(500),
    ]);
    setAccounts((a as SupplyAccount[]) ?? []);
    setBrands((b as BrandRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!roleLoading && !isAdmin) router.replace('/admin');
  }, [roleLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  useEffect(() => {
    const t = setTimeout(() => setUserSearchDebounced(userSearch.trim()), 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = userSearchDebounced.replace(/[%_,]/g, '').slice(0, 80);
      if (q.length < 2) {
        setUserHits([]);
        setUserSearchLoading(false);
        return;
      }
      setUserSearchLoading(true);
      const pat = `%${q}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,username,full_name')
        .or(`email.ilike.${pat},username.ilike.${pat},full_name.ilike.${pat}`)
        .limit(25);
      if (cancelled) return;
      setUserSearchLoading(false);
      if (error) {
        setUserHits([]);
        return;
      }
      setUserHits((data as ProfileHit[]) ?? []);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [userSearchDebounced]);

  const scrollToAssign = useCallback(() => {
    assignSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const prefillAccount = useCallback(
    (accountId: string) => {
      setMemberSupplyId(accountId);
      scrollToAssign();
    },
    [scrollToAssign]
  );

  const createAccount = async () => {
    const n = name.trim();
    if (!n) {
      toast({ variant: 'destructive', title: 'Name required' });
      return;
    }
    const s = (slug.trim() || slugFromName(n)).toLowerCase();
    setCreating(true);
    const { error } = await supabase.from('supply_accounts').insert({
      name: n,
      slug: s,
      account_type: accountType,
      brand_id: brandId.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      is_published: false,
    });
    setCreating(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Create failed', description: error.message });
      return;
    }
    toast({ title: 'Supply account created' });
    setName('');
    setSlug('');
    setBrandId('');
    setContactEmail('');
    setContactPhone('');
    void load();
  };

  const togglePublished = async (id: string, next: boolean) => {
    const { error } = await supabase.from('supply_accounts').update({ is_published: next }).eq('id', id);
    if (error) toast({ variant: 'destructive', title: error.message });
    else void load();
  };

  const addMember = async () => {
    const uid = (selectedProfile?.id ?? memberUserIdPaste).trim();
    const sid = memberSupplyId.trim();
    if (!sid) {
      toast({ variant: 'destructive', title: 'Choose a supply account' });
      return;
    }
    if (!uid) {
      toast({ variant: 'destructive', title: 'Search and pick a user, or paste their profile UUID' });
      return;
    }
    const { error } = await supabase.from('supply_account_members').insert({
      supply_account_id: sid,
      user_id: uid,
      role: memberRole,
    });
    if (error) toast({ variant: 'destructive', title: error.message });
    else {
      toast({ title: 'Member assigned to supply account' });
      setSelectedProfile(null);
      setMemberUserIdPaste('');
      setUserSearch('');
      setUserHits([]);
      void load();
    }
  };

  if (roleLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Supply exchange</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Curate B2B suppliers, publish when ready, and assign portal access by picking a user (search) or pasting
          their profile UUID. Assigned users see <span className="text-zinc-300">Supply portal</span> in the header
          Workspaces menu (same as platform admins, who can open every account without a row here).
        </p>
      </div>

      <Card className="space-y-4 border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold">New supply account</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-900" />
          </div>
          <div>
            <Label>Slug (optional)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto from name"
              className="mt-1 border-zinc-700 bg-zinc-900"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as 'brand' | 'distributor')}>
              <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">brand</SelectItem>
                <SelectItem value="distributor">distributor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Brand link (optional)</Label>
            <Select value={brandId || '__none__'} onValueChange={(v) => setBrandId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Contact email (RFQ notify)</Label>
            <Input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 border-zinc-700 bg-zinc-900"
            />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 border-zinc-700 bg-zinc-900"
            />
          </div>
        </div>
        <Button type="button" disabled={creating} onClick={() => void createAccount()} className="bg-green-700">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
        </Button>
      </Card>

      <Card ref={assignSectionRef} className="space-y-4 border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold">Assign supply portal access</h2>
        <p className="text-xs text-zinc-500">
          Creates a row in <code className="text-zinc-400">supply_account_members</code> so that user can open{' '}
          <strong className="text-zinc-300">Workspaces → Supply portal</strong> and manage listings for that account.
        </p>
        <div>
          <Label>Supply account</Label>
          <Select value={memberSupplyId || '__none__'} onValueChange={(v) => setMemberSupplyId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900">
              <SelectValue placeholder="Choose account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Choose account…</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.slug})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Find user</Label>
          <div className="relative mt-1">
            <Input
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setSelectedProfile(null);
              }}
              placeholder="Type email, username, or name (2+ characters)"
              className="border-zinc-700 bg-zinc-900 pr-9"
              disabled={Boolean(selectedProfile)}
            />
            {userSearchLoading ? (
              <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
            ) : null}
          </div>
          {selectedProfile ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-sky-900/40 bg-sky-950/30 px-3 py-2 text-sm">
              <span className="text-sky-200">{profileLabel(selectedProfile)}</span>
              <span className="font-mono text-xs text-zinc-500">{selectedProfile.id}</span>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedProfile(null)}>
                Clear
              </Button>
            </div>
          ) : userHits.length > 0 && userSearchDebounced.length >= 2 ? (
            <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/80">
              {userHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-800"
                    onClick={() => {
                      setSelectedProfile(h);
                      setUserHits([]);
                      setUserSearch('');
                    }}
                  >
                    <span className="text-zinc-100">{profileLabel(h)}</span>
                    <span className="font-mono text-[11px] text-zinc-500">{h.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : userSearchDebounced.length >= 2 && !userSearchLoading && userHits.length === 0 ? (
            <p className="mt-1 text-xs text-zinc-500">No matches — try another term or paste UUID below.</p>
          ) : null}
        </div>
        <div>
          <button
            type="button"
            className="text-xs text-sky-400/90 underline-offset-2 hover:underline"
            onClick={() => setShowUuidPaste((v) => !v)}
          >
            {showUuidPaste ? 'Hide' : 'Show'} paste profile UUID (same as auth user id)
          </button>
          {showUuidPaste ? (
            <div className="mt-2">
              <Input
                value={memberUserIdPaste}
                onChange={(e) => {
                  setMemberUserIdPaste(e.target.value);
                  setSelectedProfile(null);
                }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="border-zinc-700 bg-zinc-900 font-mono text-xs"
              />
            </div>
          ) : null}
        </div>
        <div>
          <Label>Role</Label>
          <Select value={memberRole} onValueChange={(v) => setMemberRole(v as 'owner' | 'editor')}>
            <SelectTrigger className="mt-1 w-48 border-zinc-700 bg-zinc-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">editor</SelectItem>
              <SelectItem value="owner">owner</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" onClick={() => void addMember()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Assign member
        </Button>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Accounts</h2>
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        ) : (
          <div className="space-y-4">
            {accounts.map((acc) => (
              <Card key={acc.id} className="space-y-3 border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{acc.name}</p>
                    <p className="font-mono text-xs text-zinc-500">{acc.id}</p>
                    <p className="text-xs text-zinc-500">
                      {acc.slug} · {acc.account_type}
                      {acc.brand_id ? ` · brand ${acc.brand_id}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => prefillAccount(acc.id)}>
                      Assign user here
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={acc.is_published ? 'secondary' : 'default'}
                      onClick={() => void togglePublished(acc.id, !acc.is_published)}
                    >
                      {acc.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  {acc.contact_email ?? '—'} · {acc.contact_phone ?? '—'}
                </p>
                <MembersList supplyAccountId={acc.id} onRemoved={() => void load()} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MembersList({ supplyAccountId, onRemoved }: { supplyAccountId: string; onRemoved: () => void }) {
  const [rows, setRows] = useState<{ id: string; user_id: string; role: string; label: string }[]>([]);
  const { toast } = useToast();

  const loadM = useCallback(async () => {
    const { data, error } = await supabase
      .from('supply_account_members')
      .select('id,user_id,role')
      .eq('supply_account_id', supplyAccountId);
    if (error) {
      setRows([]);
      return;
    }
    const base = (data as { id: string; user_id: string; role: string }[]) ?? [];
    const ids = Array.from(new Set(base.map((r) => r.user_id)));
    const labelById = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id,email,username,full_name').in('id', ids);
      for (const p of (profs as ProfileHit[]) ?? []) {
        labelById.set(p.id, profileLabel(p));
      }
    }
    setRows(
      base.map((r) => ({
        ...r,
        label: labelById.get(r.user_id) ?? r.user_id,
      }))
    );
  }, [supplyAccountId]);

  useEffect(() => {
    void loadM();
  }, [loadM]);

  const remove = async (id: string) => {
    const { error } = await supabase.from('supply_account_members').delete().eq('id', id);
    if (error) toast({ variant: 'destructive', title: error.message });
    else {
      onRemoved();
      void loadM();
    }
  };

  if (!rows.length) return <p className="text-xs text-zinc-500">No members.</p>;

  return (
    <ul className="space-y-1 border-t border-zinc-800 pt-2">
      {rows.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 text-zinc-300">
            <span className="font-medium text-zinc-200">{m.label}</span>
            <span className="ml-2 font-mono text-[10px] text-zinc-500">{m.user_id}</span>
            <span className="ml-2 text-zinc-500">· {m.role}</span>
          </span>
          <Button type="button" size="icon" variant="ghost" onClick={() => void remove(m.id)}>
            <Trash2 className="h-3 w-3 text-zinc-500" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
