'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type PendingInvite = {
  invitation_id: string;
  vendor_id: string;
  vendor_name: string;
  expires_at: string;
  created_at: string;
};

export default function AccountInvitesPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') ?? '';
  const token = useMemo(() => tokenParam.trim(), [tokenParam]);

  const [rows, setRows] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('vendor_list_my_pending_invitations');
    if (error) {
      toast({ title: 'Could not load invites', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      setRows((data || []) as PendingInvite[]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      void load();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, load]);

  async function acceptById(invitationId: string) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('vendor_accept_manager_invitation_by_id', {
        p_invitation_id: invitationId,
      });
      if (error) throw error;
      toast({ title: 'Invitation accepted', description: 'You can now open vendor dashboard access for that shop.' });
      void load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Could not accept invite', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function acceptByToken() {
    if (!token) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('vendor_accept_manager_invitation', {
        p_token: token,
      });
      if (error) throw error;
      toast({ title: 'Invitation accepted', description: 'Manager access is now active on your account.' });
      void load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Token acceptance failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-gray-400">Loading invites...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-center">
        <Card className="max-w-md border-green-900/20 bg-gray-900 p-6 text-white">
          <p className="text-gray-300">Sign in first to view and accept manager invites.</p>
          <p className="mt-2 text-xs text-gray-500">You must use the same email address that received the invite.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto max-w-3xl space-y-6 px-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-white">Vendor invitations</h1>
          <Button asChild variant="outline" className="border-gray-700 text-gray-300">
            <Link href="/account">Back to account</Link>
          </Button>
        </div>

        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <h2 className="mb-2 text-xl font-semibold text-white">Accept from invite link</h2>
          <p className="mb-4 text-sm text-gray-400">
            If this page opened from an invite URL, you can accept directly below.
          </p>
          {token ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-green-700/50 text-green-300">
                Token detected
              </Badge>
              <Button disabled={saving} className="bg-brand-lime text-black hover:bg-brand-lime-soft" onClick={() => void acceptByToken()}>
                Accept this invitation
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No token in URL. You can still accept from the list below.</p>
          )}
        </Card>

        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Invitations for your account email</h2>
            <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => void load()} disabled={saving}>
              Refresh
            </Button>
          </div>
          {rows.length === 0 ? (
            <p className="text-gray-500">No pending vendor invites for your signed-in email.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.invitation_id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-800 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{row.vendor_name}</p>
                    <p className="text-xs text-gray-500">Expires {new Date(row.expires_at).toLocaleString()}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    className="bg-brand-lime text-black hover:bg-brand-lime-soft"
                    onClick={() => void acceptById(row.invitation_id)}
                  >
                    Accept
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
