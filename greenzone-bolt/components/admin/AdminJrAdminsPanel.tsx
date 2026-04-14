"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCog, UserMinus } from 'lucide-react';

type JrAdminRow = {
  id: string;
  email: string;
  full_name: string | null;
  updated_at: string | null;
};

export function AdminJrAdminsPanel() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<JrAdminRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const loadJrAdmins = useCallback(async () => {
    setListLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,updated_at')
      .eq('role', 'admin_jr')
      .order('email', { ascending: true });
    if (error) {
      toast({ title: 'Could not load junior admins', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      setRows((data as JrAdminRow[]) ?? []);
    }
    setListLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadJrAdmins();
  }, [loadJrAdmins]);

  async function resolveTargetId(raw: string): Promise<string | null> {
    const q = raw.trim().toLowerCase();
    if (!q) return null;

    const { data: byProfile, error: profErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', q)
      .maybeSingle();

    if (profErr) {
      throw new Error(profErr.message);
    }
    if (byProfile?.id) return byProfile.id;

    return null;
  }

  async function demoteUserId(userId: string, labelForToast: string) {
    const { error } = await supabase.rpc('master_promote_jr_admin', {
      p_target_user_id: userId,
      p_promote: false,
    });
    if (error) throw error;
    await logAdminAuditEvent(supabase, {
      actionKey: 'admin_jr.demote',
      summary: `Revoked junior admin for user ${userId}`,
      resourceType: 'profile',
      resourceId: userId,
      metadata: { promote: false },
    });
    toast({
      title: 'Junior admin removed',
      description: `${labelForToast}: role set back to customer.`,
    });
    await loadJrAdmins();
  }

  async function run(promote: boolean) {
    const id = await resolveTargetId(email);
    if (!id) {
      toast({
        title: 'User not found',
        description: 'No profile matches that email. They must sign up first.',
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.rpc('master_promote_jr_admin', {
        p_target_user_id: id,
        p_promote: promote,
      });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: promote ? 'admin_jr.promote' : 'admin_jr.demote',
        summary: `${promote ? 'Granted' : 'Revoked'} junior admin for user ${id}`,
        resourceType: 'profile',
        resourceId: id,
        metadata: { promote },
      });
      toast({
        title: promote ? 'Junior admin granted' : 'Junior admin removed',
        description: promote
          ? 'They now have admin access (promotion is limited to masters only).'
          : 'Role set back to customer.',
      });
      setEmail('');
      await loadJrAdmins();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      toast({ title: 'Could not update role', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function unlinkRow(row: JrAdminRow) {
    const label = row.email || row.id;
    if (!confirm(`Remove junior admin access for ${label}? They will become a customer again.`)) return;
    setUnlinkingId(row.id);
    try {
      await demoteUserId(row.id, label);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      toast({ title: 'Could not unlink', description: msg, variant: 'destructive' });
    } finally {
      setUnlinkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 border-amber-900/30 bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="flex items-start gap-3">
          <UserCog className="mt-0.5 h-8 w-8 shrink-0 text-amber-400" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold text-white">Current junior admins</h3>
            <p className="mt-1 text-sm text-gray-400">
              Users with <span className="text-gray-300">profiles.role = admin_jr</span>. Unlink sets their role back to
              customer (same as &quot;Remove junior admin&quot; by email below).
            </p>
          </div>
        </div>
        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" aria-hidden />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No junior admins right now.</p>
        ) : (
          <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-950/50">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{r.email}</p>
                  {r.full_name?.trim() ? (
                    <p className="truncate text-sm text-gray-400">{r.full_name.trim()}</p>
                  ) : null}
                  <p className="mt-0.5 font-mono text-[11px] text-gray-600">{r.id}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={unlinkingId === r.id}
                  className="shrink-0 border-red-900/50 text-red-300 hover:bg-red-950/40"
                  onClick={() => void unlinkRow(r)}
                >
                  {unlinkingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      <UserMinus className="mr-1.5 h-4 w-4" aria-hidden />
                      Unlink
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => void loadJrAdmins()}>
          Refresh list
        </Button>
      </Card>

      <Card className="space-y-4 border-amber-900/30 bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="flex items-start gap-3">
          <UserCog className="mt-0.5 h-8 w-8 shrink-0 text-amber-400" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold text-white">Grant or revoke by email</h3>
            <p className="mt-1 text-sm text-gray-400">
              Master accounts only: grant or revoke <span className="text-gray-300">admin_jr</span> for an existing user by
              their login email. Junior admins have the same platform tools as full admins but cannot use this panel.
            </p>
          </div>
        </div>
        <div className="max-w-md space-y-2">
          <Label htmlFor="jr-admin-email" className="text-gray-300">
            User email
          </Label>
          <Input
            id="jr-admin-email"
            type="email"
            autoComplete="off"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-gray-700 bg-gray-950 text-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || !email.trim()}
            className="bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => void run(true)}
          >
            Make junior admin
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !email.trim()}
            className="border-gray-600 text-gray-200 hover:bg-gray-800"
            onClick={() => void run(false)}
          >
            Remove junior admin
          </Button>
        </div>
      </Card>
    </div>
  );
}
