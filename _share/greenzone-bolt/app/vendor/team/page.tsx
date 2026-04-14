'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VendorSubpageLayout } from '@/components/vendor/VendorSubpageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

type TeamMemberRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  joined_at: string;
};

type PendingInviteRow = {
  id: string;
  email_normalized: string;
  expires_at: string;
  created_at: string;
};

export default function VendorTeamPage() {
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell, isOwnerOfCurrentVendor } = useVendorBusiness();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState('');
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInviteRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  const loadTeam = useCallback(async () => {
    if (!vendor) {
      setTeamMembers([]);
      setPendingInvites([]);
      setLoadingRows(false);
      return;
    }
    setLoadingRows(true);
    const [{ data: members, error: membersErr }, { data: invites, error: invitesErr }] = await Promise.all([
      supabase.rpc('vendor_list_team_members', { p_vendor_id: vendor.id }),
      supabase.rpc('vendor_list_pending_invitations', { p_vendor_id: vendor.id }),
    ]);
    if (membersErr) {
      toast({ title: 'Could not load team members', description: membersErr.message, variant: 'destructive' });
      setTeamMembers([]);
    } else {
      setTeamMembers((members || []) as TeamMemberRow[]);
    }
    if (invitesErr) {
      toast({ title: 'Could not load invitations', description: invitesErr.message, variant: 'destructive' });
      setPendingInvites([]);
    } else {
      setPendingInvites((invites || []) as PendingInviteRow[]);
    }
    setLoadingRows(false);
  }, [vendor, toast]);

  useEffect(() => {
    if (vendor) {
      void loadTeam();
    }
  }, [vendor, loadTeam]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('vendor_invite_manager', {
        p_vendor_id: vendor.id,
        p_email: normalized,
      });
      if (error) throw error;
      const token = typeof data === 'string' ? data : null;
      setLastInviteToken(token);
      setInviteEmail('');
      toast({
        title: 'Invitation created',
        description: 'Share the invite link with that email owner so they can accept manager access.',
      });
      void loadTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Invite failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(invitationId: string) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('vendor_revoke_manager_invitation', { p_invitation_id: invitationId });
      if (error) throw error;
      toast({ title: 'Invite revoked' });
      void loadTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Could not revoke invite', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!vendor) return;
    if (!isOwnerOfCurrentVendor) {
      toast({ title: 'Only linked owner can remove managers', variant: 'destructive' });
      return;
    }
    if (!window.confirm('Remove this manager from vendor dashboard access?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('vendor_remove_team_member', {
        p_vendor_id: vendor.id,
        p_user_id: userId,
      });
      if (error) throw error;
      toast({ title: 'Manager removed' });
      void loadTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Could not remove manager', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-gray-400">
        Loading...
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">You need vendor access to open Team.</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">This page requires vendors mode.</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">No vendor linked for this account.</p>
      </div>
    );
  }

  const inviteLink =
    lastInviteToken != null && typeof window !== 'undefined'
      ? `${window.location.origin}/account/invites?token=${encodeURIComponent(lastInviteToken)}`
      : null;

  return (
    <VendorSubpageLayout
      title={`Team access - ${vendor.name}`}
      subtitle="Invite managers by email. Managers can use the vendor dashboard but do not become owner."
    >
      <div className="space-y-6">
        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <h2 className="mb-2 text-xl font-semibold text-white">Invite manager</h2>
          <p className="mb-4 text-sm text-gray-400">
            We verify by account email. The invited user must sign in with that exact email to accept.
          </p>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleInvite}>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="manager@email.com"
              className="border-gray-700 bg-black"
              required
            />
            <Button type="submit" className="bg-brand-lime text-black hover:bg-brand-lime-soft" disabled={saving}>
              Send invite
            </Button>
          </form>
          {inviteLink ? (
            <div className="mt-4 rounded-lg border border-green-900/30 bg-black/40 p-3">
              <p className="text-xs text-gray-500">Copy and send this one-time invite link:</p>
              <p className="mt-1 break-all font-mono text-sm text-green-300">{inviteLink}</p>
            </div>
          ) : null}
        </Card>

        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Pending invitations</h2>
            <Button variant="outline" className="border-gray-600" onClick={() => void loadTeam()} disabled={saving}>
              Refresh
            </Button>
          </div>
          {loadingRows ? (
            <p className="text-gray-500">Loading invites...</p>
          ) : pendingInvites.length === 0 ? (
            <p className="text-gray-500">No pending invites.</p>
          ) : (
            <ul className="space-y-2">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-800 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{inv.email_normalized}</p>
                    <p className="text-xs text-gray-500">Expires {new Date(inv.expires_at).toLocaleString()}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-700/50 text-amber-200"
                    onClick={() => void handleRevoke(inv.id)}
                    disabled={saving}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <h2 className="mb-3 text-xl font-semibold text-white">Current managers</h2>
          {!isOwnerOfCurrentVendor ? (
            <Badge variant="outline" className="mb-3 border-amber-700/50 text-amber-200">
              You are a manager. Only the linked owner can remove managers.
            </Badge>
          ) : null}
          {loadingRows ? (
            <p className="text-gray-500">Loading managers...</p>
          ) : teamMembers.length === 0 ? (
            <p className="text-gray-500">No managers added yet.</p>
          ) : (
            <ul className="space-y-2">
              {teamMembers.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-800 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{m.email || m.user_id}</p>
                    <p className="text-xs text-gray-500">
                      {m.full_name ? `${m.full_name} - ` : ''}joined {new Date(m.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-700/50 text-red-300"
                    onClick={() => void handleRemoveMember(m.user_id)}
                    disabled={saving || !isOwnerOfCurrentVendor}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </VendorSubpageLayout>
  );
}
