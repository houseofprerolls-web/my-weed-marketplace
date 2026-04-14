'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, X, Trash2, ImagePlus, Upload } from 'lucide-react';
import {
  bannerKind,
  HOMEPAGE_BANNER_PRESETS,
  homepageBannerPresetClass,
  type HomepageBannerRow,
} from '@/lib/smokersClubHomepageBanners';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';

type Row = HomepageBannerRow & { vendor_name?: string | null };

type Props = {
  onQueueChanged?: () => void;
};

export function AdminSmokersClubBannersPanel({ onQueueChanged }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminLink, setAdminLink] = useState('');
  const [adminPreset, setAdminPreset] = useState<string>(HOMEPAGE_BANNER_PRESETS[0].value);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('smokers_club_homepage_banners')
      .select(
        'id,vendor_id,banner_kind,image_url,link_url,slot_preset,status,admin_note,created_at'
      )
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
      setRows([]);
      setLoading(false);
      return;
    }
    const list = (data || []) as HomepageBannerRow[];
    const ids = Array.from(
      new Set(list.map((r) => r.vendor_id).filter((id): id is string => id != null))
    );
    const nameBy = new Map<string, string>();
    if (ids.length) {
      const { data: vn } = await supabase.from('vendors').select('id,name').in('id', ids);
      for (const v of (vn || []) as { id: string; name: string | null }[]) {
        nameBy.set(v.id, v.name || '');
      }
    }
    setRows(
      list.map((r) => ({
        ...r,
        vendor_name: r.vendor_id ? nameBy.get(r.vendor_id) || null : null,
      }))
    );
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rowLabel = (row: Row) =>
    bannerKind(row) === 'admin' ? 'Platform spotlight' : row.vendor_name || row.vendor_id || 'Vendor';

  const approve = async (row: Row) => {
    setBusyId(row.id);
    try {
      if (row.vendor_id != null && bannerKind(row) === 'vendor') {
        const { error: arch } = await supabase
          .from('smokers_club_homepage_banners')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('vendor_id', row.vendor_id)
          .eq('status', 'approved');
        if (arch) throw arch;
      }
      const { error: ok } = await supabase
        .from('smokers_club_homepage_banners')
        .update({ status: 'approved', admin_note: null, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (ok) throw ok;
      toast({ title: 'Banner approved', description: 'Live on homepage carousel (slot-weighted).' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Approve failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: Row) => {
    const note = window.prompt('Optional note to store with rejection (internal):') ?? '';
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from('smokers_club_homepage_banners')
        .update({
          status: 'rejected',
          admin_note: note.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Banner rejected' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Reject failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (row: Row) => {
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from('smokers_club_homepage_banners')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Removed from homepage' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Archive failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const deleteRow = async (row: Row) => {
    if (!window.confirm('Permanently delete this banner row? This cannot be undone.')) return;
    setBusyId(row.id);
    try {
      const { error } = await supabase.from('smokers_club_homepage_banners').delete().eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Banner deleted' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const replaceImage = async (row: Row, file: File) => {
    if (!user?.id) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    setBusyId(row.id);
    try {
      const up = await uploadVendorMediaFile(user.id, file);
      if ('error' in up) throw new Error(up.error);
      const { error } = await supabase
        .from('smokers_club_homepage_banners')
        .update({ image_url: up.url, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Image updated' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Replace failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const submitAdminBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    const link = adminLink.trim();
    if (!adminFile) {
      toast({ title: 'Choose an image', variant: 'destructive' });
      return;
    }
    if (!link) {
      toast({ title: 'Link URL required', description: 'Platform banners need a click-through URL.', variant: 'destructive' });
      return;
    }
    setAdminSubmitting(true);
    try {
      const up = await uploadVendorMediaFile(user.id, adminFile);
      if ('error' in up) throw new Error(up.error);
      const { error } = await supabase.from('smokers_club_homepage_banners').insert({
        banner_kind: 'admin',
        vendor_id: null,
        image_url: up.url,
        link_url: link,
        slot_preset: adminPreset,
        status: 'approved',
      });
      if (error) throw error;
      toast({ title: 'Platform banner live', description: 'Shown in the homepage spotlight carousel.' });
      setAdminFile(null);
      setAdminLink('');
      await load();
      onQueueChanged?.();
    } catch (err: unknown) {
      toast({
        title: 'Add failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAdminSubmitting(false);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const live = rows.filter((r) => r.status === 'approved');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-amber-900/30 bg-amber-950/10 p-4 text-sm text-amber-100/90">
        Approve vendor submissions to publish under <strong className="text-white">Smokers Club spotlight</strong> on the
        homepage. Rotation time favors better tree slots; <strong className="text-white">platform</strong> banners use a
        fixed strong dwell. Only one approved banner per vendor; approving a new vendor creative archives the previous.
        You can add platform-only banners (no shop) and replace or delete images anytime.
      </Card>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <ImagePlus className="h-5 w-5 text-brand-lime" />
          Add platform spotlight banner
        </h2>
        <Card className="border-green-900/25 bg-gray-950/80 p-4">
          <form className="space-y-4" onSubmit={submitAdminBanner}>
            <div>
              <Label className="text-gray-300">Image</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1 border-green-900/40 bg-gray-950 text-gray-300 file:text-gray-400"
                onChange={(e) => setAdminFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label className="text-gray-300">Click-through URL (required)</Label>
              <Input
                value={adminLink}
                onChange={(e) => setAdminLink(e.target.value)}
                placeholder="https://… or /path"
                className="mt-1 border-green-900/40 bg-gray-950 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <Label className="text-gray-300">Shape preset</Label>
              <Select value={adminPreset} onValueChange={setAdminPreset}>
                <SelectTrigger className="mt-1 border-green-900/40 bg-gray-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOMEPAGE_BANNER_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label} — {p.hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={adminSubmitting || !adminFile} className="bg-green-600 hover:bg-green-700">
              {adminSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish platform banner'}
            </Button>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Pending review ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-gray-500">No pending banners.</p>
        ) : (
          <ul className="space-y-6">
            {pending.map((row) => (
              <li key={row.id}>
                <Card className="border-green-900/25 bg-gray-950/80 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <div
                      className={`relative shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black ${homepageBannerPresetClass(row.slot_preset)}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.image_url} alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{rowLabel(row)}</p>
                        {bannerKind(row) === 'admin' && (
                          <Badge className="bg-violet-700/40 text-white">Platform</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Preset: {row.slot_preset}</p>
                      {row.link_url && (
                        <p className="truncate text-xs text-gray-400">Link: {row.link_url}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          ref={(el) => {
                            replaceInputRefs.current[row.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void replaceImage(row, f);
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/20"
                          disabled={busyId === row.id}
                          onClick={() => replaceInputRefs.current[row.id]?.click()}
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          Replace image
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={busyId === row.id}
                          onClick={() => approve(row)}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-1 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === row.id}
                          onClick={() => reject(row)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                          disabled={busyId === row.id}
                          onClick={() => deleteRow(row)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Live on homepage ({live.length})</h2>
        {live.length === 0 ? (
          <p className="text-gray-500">None.</p>
        ) : (
          <ul className="space-y-4">
            {live.map((row) => (
              <li key={row.id}>
                <Card className="flex flex-col gap-4 border-green-800/30 bg-gray-950/60 p-4 sm:flex-row sm:items-start">
                  <div
                    className={`relative shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black ${homepageBannerPresetClass(row.slot_preset)}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.image_url} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="w-fit bg-green-700/40">Approved</Badge>
                      {bannerKind(row) === 'admin' && (
                        <Badge className="bg-violet-700/40 text-white">Platform</Badge>
                      )}
                      <p className="font-medium text-white">{rowLabel(row)}</p>
                    </div>
                    {row.link_url && (
                      <p className="mt-1 truncate text-xs text-gray-400">Link: {row.link_url}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        ref={(el) => {
                          replaceInputRefs.current[`live-${row.id}`] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) void replaceImage(row, f);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => replaceInputRefs.current[`live-${row.id}`]?.click()}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        Replace image
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => archive(row)}
                      >
                        Pull from homepage
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                        disabled={busyId === row.id}
                        onClick={() => deleteRow(row)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
