'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';

type AdminUserRow = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  site_banned: boolean;
  site_banned_at: string | null;
  feed_shadowbanned: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  auth_banned_until: string | null;
  is_master_admin: boolean;
};

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

export default function AdminUsersPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [mode, setMode] = useState<'page' | 'search'>('page');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 25;
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'ban' | 'shadow' | null>(null);

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setRows([]);
        return;
      }
      const q = appliedSearch.trim();
      const url =
        q.length > 0
          ? `/api/admin/users?q=${encodeURIComponent(q)}&per_page=${perPage}`
          : `/api/admin/users?page=${page}&per_page=${perPage}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j = (await res.json()) as {
        users?: AdminUserRow[];
        total?: number;
        mode?: string;
        error?: string;
      };
      if (!res.ok) {
        toast({
          title: 'Could not load users',
          description: j.error || res.statusText,
          variant: 'destructive',
        });
        setRows([]);
        return;
      }
      setRows(j.users || []);
      setTotal(typeof j.total === 'number' ? j.total : (j.users || []).length);
      setMode(j.mode === 'search' ? 'search' : 'page');
    } finally {
      setListLoading(false);
    }
  }, [appliedSearch, page, perPage, toast]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  async function patchSiteBan(row: AdminUserRow, nextBanned: boolean) {
    if (row.id === me?.id) {
      toast({ title: 'You cannot change your own ban status', variant: 'destructive' });
      return;
    }
    if (row.is_master_admin && nextBanned) {
      toast({ title: 'Master admin accounts cannot be banned', variant: 'destructive' });
      return;
    }
    if (nextBanned) {
      const ok = window.confirm(
        `Ban ${row.email || row.id} from the site? They will be signed out and blocked from signing in.`
      );
      if (!ok) return;
    }
    setBusyId(row.id);
    setBusyAction('ban');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: 'Sign in required', variant: 'destructive' });
        return;
      }
      const res = await fetch('/api/admin/site-ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: row.id, banned: nextBanned }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast({
          title: 'Could not update site ban',
          description: j.error || res.statusText,
          variant: 'destructive',
        });
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                site_banned: nextBanned,
                site_banned_at: nextBanned ? new Date().toISOString() : null,
                auth_banned_until: nextBanned ? r.auth_banned_until : null,
              }
            : r
        )
      );
      toast({
        title: nextBanned ? 'User banned from site' : 'Site ban removed',
        description: nextBanned
          ? 'Auth sessions are invalidated; new sign-ins are blocked until unbanned.'
          : 'They can sign in again.',
      });
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function patchShadowban(row: AdminUserRow, nextShadow: boolean) {
    setBusyId(row.id);
    setBusyAction('shadow');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: 'Sign in required', variant: 'destructive' });
        return;
      }
      const res = await fetch('/api/admin/feed-shadowban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: row.id, shadowbanned: nextShadow }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast({
          title: 'Could not update feed shadowban',
          description: j.error || res.statusText,
          variant: 'destructive',
        });
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, feed_shadowbanned: nextShadow } : r))
      );
      toast({
        title: nextShadow ? 'Feed shadowban on' : 'Feed shadowban off',
        description: nextShadow
          ? 'Their feed activity is hidden from other shoppers.'
          : 'Feed visibility restored.',
      });
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  if (roleLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-zinc-300">
        <p>You do not have access to this page.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    );
  }

  const lastPage = mode === 'page' ? Math.max(1, Math.ceil(total / perPage)) : 1;
  const showBanned = (r: AdminUserRow) => r.site_banned || Boolean(r.auth_banned_until);

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950/80 ring-1 ring-emerald-800/50">
              <Users className="h-5 w-5 text-emerald-300" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Users</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Browse accounts, last sign-in, site ban, and feed shadowban (hidden from feed only).
              </p>
            </div>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="admin-user-search" className="text-zinc-300">
                Search profiles
              </Label>
              <Input
                id="admin-user-search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    setAppliedSearch(searchDraft.trim());
                  }
                }}
                placeholder="Email, username, or name…"
                className="border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                className="bg-emerald-700 text-white hover:bg-emerald-600"
                onClick={() => {
                  setPage(1);
                  setAppliedSearch(searchDraft.trim());
                }}
              >
                Search
              </Button>
              {appliedSearch ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    setSearchDraft('');
                    setAppliedSearch('');
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
          {mode === 'page' ? (
            <p className="mt-3 text-xs text-zinc-500">
              Page {page} of {lastPage}
              {total > 0 ? ` · ${total} users (approx.)` : null}
            </p>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">Search results ({rows.length})</p>
          )}
        </Card>

        <Card className="overflow-hidden border-zinc-800 bg-zinc-900/30">
          {listLoading ? (
            <div className="flex justify-center py-20 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-500">No users in this view.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Last sign-in</th>
                      <th className="px-4 py-3 font-medium">Site ban</th>
                      <th className="px-4 py-3 font-medium">Feed shadow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {rows.map((r) => {
                      const self = r.id === me?.id;
                      const banBusy = busyId === r.id && busyAction === 'ban';
                      const shadowBusy = busyId === r.id && busyAction === 'shadow';
                      return (
                        <tr key={r.id} className="bg-zinc-950/20 hover:bg-zinc-900/40">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{r.email || '—'}</div>
                            <div className="text-xs text-zinc-500">
                              {[r.username, r.full_name].filter(Boolean).join(' · ') || r.id.slice(0, 8)}
                            </div>
                            {r.is_master_admin ? (
                              <Badge className="mt-1 border-amber-700/50 bg-amber-950/50 text-amber-200/90">
                                Master admin
                              </Badge>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{r.role ?? '—'}</td>
                          <td className="px-4 py-3 text-zinc-400">{formatWhen(r.last_sign_in_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={showBanned(r)}
                                disabled={self || r.is_master_admin || banBusy}
                                onCheckedChange={(v) => void patchSiteBan(r, v)}
                                aria-label={`Site ban ${r.email}`}
                              />
                              {banBusy ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : null}
                            </div>
                            {r.site_banned_at ? (
                              <div className="mt-1 text-[10px] text-zinc-600">
                                since {formatWhen(r.site_banned_at)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={r.feed_shadowbanned}
                                disabled={shadowBusy}
                                onCheckedChange={(v) => void patchShadowban(r, v)}
                                aria-label={`Feed shadowban ${r.email}`}
                              />
                              {shadowBusy ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-zinc-800 lg:hidden">
                {rows.map((r) => {
                  const self = r.id === me?.id;
                  const banBusy = busyId === r.id && busyAction === 'ban';
                  const shadowBusy = busyId === r.id && busyAction === 'shadow';
                  return (
                    <li key={r.id} className="space-y-3 px-4 py-4">
                      <div>
                        <div className="font-medium text-white">{r.email || '—'}</div>
                        <div className="text-xs text-zinc-500">
                          {[r.username, r.full_name].filter(Boolean).join(' · ') || r.id.slice(0, 8)}
                        </div>
                        {r.is_master_admin ? (
                          <Badge className="mt-2 border-amber-700/50 bg-amber-950/50 text-amber-200/90">
                            Master admin
                          </Badge>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                        <div>
                          <span className="text-zinc-600">Role</span>
                          <div className="text-zinc-300">{r.role ?? '—'}</div>
                        </div>
                        <div>
                          <span className="text-zinc-600">Last sign-in</span>
                          <div>{formatWhen(r.last_sign_in_at)}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                        <span className="text-xs font-medium text-zinc-400">Site ban</span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={showBanned(r)}
                            disabled={self || r.is_master_admin || banBusy}
                            onCheckedChange={(v) => void patchSiteBan(r, v)}
                          />
                          {banBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                        <span className="text-xs font-medium text-zinc-400">Feed shadowban</span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.feed_shadowbanned}
                            disabled={shadowBusy}
                            onCheckedChange={(v) => void patchShadowban(r, v)}
                          />
                          {shadowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {mode === 'page' && !appliedSearch ? (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-200"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-2 text-sm text-zinc-500">
              {page} / {lastPage}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-200"
              disabled={page >= lastPage || listLoading || rows.length < perPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
