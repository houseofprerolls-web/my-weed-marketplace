'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { VendorNav } from '@/components/vendor/VendorNav';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Award, ImagePlus, Info, LayoutTemplate, Loader2, Mail, Sparkles, TrendingUp } from 'lucide-react';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SMOKERS_CLUB_SLOT_RANK_MAX, SMOKERS_CLUB_SLOT_RANK_MIN } from '@/lib/smokersClub';
import { useToast } from '@/hooks/use-toast';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VendorImageFitDialog } from '@/components/vendor/VendorImageFitDialog';
const SMOKERS_CLUB_SUPPORT_EMAIL = 'support@datreehouse.com';

/** Matches discover “Featured stores” horizontal strip (mobile). */
const CLUB_SCROLL_ROW =
  '-mx-4 flex flex-nowrap gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-pl-4 scroll-pr-12 pb-3 pl-4 pr-12 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:-mx-6 sm:scroll-pr-16 sm:pl-6 sm:pr-16 [&::-webkit-scrollbar]:hidden';
const CLUB_TILE =
  'flex w-[280px] max-w-[calc(100vw-3rem)] flex-col shrink-0 snap-start snap-always flex-none rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 text-left shadow-sm sm:max-w-[280px]';

function startDateIso(range: string): string {
  const d = new Date();
  if (range === '7d') d.setDate(d.getDate() - 7);
  else if (range === '90d') d.setDate(d.getDate() - 90);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
}

export default function VendorSmokersClubPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell, refresh } = useVendorBusiness({
    adminMenuVendorId,
  });
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  /** Whether the shop has any active treehouse listing (rank is not shown to vendors). */
  const [hasActiveTreeSlot, setHasActiveTreeSlot] = useState(false);
  /** Vendors only see this derived rate, not raw impression/click counts. */
  const [treeCtrPercent, setTreeCtrPercent] = useState<number | null>(null);
  const [accessRequestNote, setAccessRequestNote] = useState('');
  const [clubTabBgDraft, setClubTabBgDraft] = useState('');
  const [clubTabBgFile, setClubTabBgFile] = useState<File | null>(null);
  const [clubTabBgPreview, setClubTabBgPreview] = useState<string | null>(null);
  const [clubTabBgSaving, setClubTabBgSaving] = useState(false);

  const [advFitOpen, setAdvFitOpen] = useState(false);
  const [advFitSrc, setAdvFitSrc] = useState<string | null>(null);
  const [advFitName, setAdvFitName] = useState('');

  function openClubTreeImageFit(file: File) {
    setAdvFitSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAdvFitName(file.name);
    setAdvFitOpen(true);
  }

  function onAdvFitOpenChange(open: boolean) {
    setAdvFitOpen(open);
    if (!open) {
      setAdvFitSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setAdvFitName('');
    }
  }

  const since = useMemo(() => startDateIso(range), [range]);
  const isClubMember = vendor?.smokers_club_eligible === true;

  const accessRequestMailto = useMemo(() => {
    if (!vendor) return '';
    const subject = `Smokers Club access request — ${vendor.name}`;
    const note = accessRequestNote.trim();
    const body = `Shop: ${vendor.name}\nVendor ID: ${vendor.id}\n\n${
      note ? `${note}\n\n` : ''
    }Please consider our store for the Smokers Club homepage tree.`;
    return `mailto:${SMOKERS_CLUB_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [vendor, accessRequestNote]);

  const load = useCallback(async () => {
    if (!vendor?.id || !vendorsMode) {
      setHasActiveTreeSlot(false);
      setTreeCtrPercent(null);
      setLoading(false);
      return;
    }
    if (vendor.smokers_club_eligible !== true) {
      setHasActiveTreeSlot(false);
      setTreeCtrPercent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const vid = vendor.id;

    const [imp, clk, slotProbe] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vid)
        .eq('event_type', 'smokers_club_tree_impression')
        .gte('created_at', since),
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vid)
        .eq('event_type', 'smokers_club_tree_click')
        .gte('created_at', since),
      supabase
        .from('vendor_market_listings')
        .select('id')
        .eq('vendor_id', vid)
        .eq('active', true)
        .eq('club_lane', 'treehouse')
        .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
        .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
        .limit(1),
    ]);

    const impN = !imp.error && typeof imp.count === 'number' ? imp.count : null;
    const clkN = !clk.error && typeof clk.count === 'number' ? clk.count : null;
    setTreeCtrPercent(
      impN != null && clkN != null && impN > 0 ? Math.round((clkN / impN) * 1000) / 10 : null
    );

    setHasActiveTreeSlot(!slotProbe.error && Array.isArray(slotProbe.data) && slotProbe.data.length > 0);

    setLoading(false);
  }, [vendor?.id, vendor?.smokers_club_eligible, vendorsMode, since]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setClubTabBgDraft(vendor?.smokers_club_tab_background_url?.trim() ?? '');
    setClubTabBgFile(null);
  }, [vendor?.id, vendor?.smokers_club_tab_background_url]);

  useEffect(() => {
    if (!clubTabBgFile) {
      setClubTabBgPreview(null);
      return;
    }
    const u = URL.createObjectURL(clubTabBgFile);
    setClubTabBgPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [clubTabBgFile]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell || !vendorsMode || !vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-white">
        <p className="text-gray-400">Sign in with a linked dispensary to view Smokers Club.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorImageFitDialog
        open={advFitOpen}
        onOpenChange={onAdvFitOpenChange}
        imageSrc={advFitSrc}
        aspect={16 / 9}
        title="Position tree card background"
        description="Backdrop behind your tree tile. Drag and zoom for the best framing behind your logo."
        maxOutputLongEdge={2600}
        outputBaseName={advFitName}
        onApply={(file) => {
          setClubTabBgFile(file);
        }}
      />
      <VendorNav />

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold lowercase md:normal-case">Smokers club</h1>
            <p className="text-gray-400">
              {isClubMember
                ? 'Tree click-through and club tools—how well your placement turns attention into visits.'
                : 'Premium homepage placement for invited shops. Learn what the club offers and request access below.'}
            </p>
          </div>

          <section className="mb-8 md:hidden" aria-label="Smokers club overview">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">At a glance</p>
            <div className={CLUB_SCROLL_ROW}>
              <div className={CLUB_TILE}>
                <Sparkles className="mb-3 h-8 w-8 text-brand-lime" aria-hidden />
                <h2 className="font-semibold text-white">Homepage tree</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Curated tree on Discover. Our team places shops per market—placement order is not shown here.
                </p>
              </div>
              {isClubMember ? (
                <>
                  <div className={CLUB_TILE}>
                    <TrendingUp className="mb-3 h-8 w-8 text-green-400" aria-hidden />
                    <h2 className="font-semibold text-white">Tree CTR</h2>
                    <p className="mt-3 text-3xl font-bold text-green-400">
                      {loading ? '—' : treeCtrPercent != null ? `${treeCtrPercent}%` : '—'}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">Opens your listing from tree views (selected range).</p>
                  </div>
                  <div className={CLUB_TILE}>
                    <ImagePlus className="mb-3 h-8 w-8 text-brand-lime" aria-hidden />
                    <h2 className="font-semibold text-white">Sponsored ads</h2>
                    <p className="mt-2 text-sm text-gray-400">
                      Different art per page slot (hero, Discover, Deals, …) — use the Sponsored ads page in the sidebar.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className={CLUB_TILE}>
                    <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                    <h2 className="font-semibold text-white">By invitation</h2>
                    <p className="mt-2 text-sm text-gray-400">
                      High-intent homepage placement next to other top shops in your area.
                    </p>
                  </div>
                  <div className={CLUB_TILE}>
                    <Mail className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                    <h2 className="font-semibold text-white">Request access</h2>
                    <p className="mt-2 text-sm text-gray-400">
                      Use the form below—we&apos;ll follow up ({SMOKERS_CLUB_SUPPORT_EMAIL}).
                    </p>
                  </div>
                </>
              )}
              <div className="min-w-6 shrink-0 sm:min-w-8" aria-hidden />
            </div>
          </section>

          <Card className="mb-8 hidden border-green-600/25 bg-gradient-to-r from-green-600/15 to-amber-900/20 p-6 md:block">
            <div className="flex gap-4">
              <Sparkles className="mt-1 h-6 w-6 shrink-0 text-brand-lime" />
              <div>
                <h2 className="mb-2 text-lg font-semibold text-white">Why join Smokers Club?</h2>
                {isClubMember ? (
                  <>
                    <p className="mb-3 text-gray-300">
                      The club is the branded tree on the homepage: up to ten shops per market in a curated order our team
                      sets. When someone taps your card, they go straight to your listing, menu, and checkout. You can see
                      how well placement converts via <strong className="text-gray-200">tree click-through</strong> (we keep
                      raw reach numbers internal).
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
                      <li>Prime homepage real estate next to other top shops in your area</li>
                      <li>Tree click-through rate so you can judge engagement without volume noise</li>
                      <li>
                        Optional sponsored banners on the homepage and across the site — upload per placement on{' '}
                        <strong className="text-gray-200">Sponsored ads</strong> (separate from this page); admin approves
                        before anything runs
                      </li>
                      <li>Works with delivery and storefront lanes our admins assign per market</li>
                    </ul>
                    <p className="mt-4 text-sm text-gray-500">
                      Slots are assigned by the DaTreehouse team. Reach out if you want to move up the tree or open a new
                      market.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-3 text-gray-300">
                      The Smokers Club is the branded <strong className="text-gray-200">tree on our homepage</strong>: a
                      curated set of shops per market so shoppers see strong placements first. It drives discovery straight
                      into your listing, menu, and checkout.
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
                      <li>High-intent visibility next to other top shops in your area</li>
                      <li>Team-managed markets, delivery, and storefront lanes</li>
                      <li>Optional sponsored ads on multiple pages once you are in the club (see Sponsored ads in the sidebar)</li>
                    </ul>
                    <p className="mt-4 text-sm text-gray-500">
                      Membership is by invitation. If your store is not in the club yet, send a request and we will review
                      your shop for the tree.
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>

          {!isClubMember && (
            <Card className="mb-8 border-amber-800/30 bg-amber-950/15 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Mail className="h-8 w-8 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <h2 className="mb-2 text-lg font-semibold text-white">Request Smokers club access</h2>
                  <p className="mb-4 text-sm text-gray-400">
                    Your dashboard does not show tree placement or club metrics until an admin marks your shop Smokers
                    Club–eligible. Use the button below to email {SMOKERS_CLUB_SUPPORT_EMAIL} with your shop details—we
                    will follow up.
                  </p>
                  <div className="mb-4">
                    <Label htmlFor="sc-access-note" className="text-gray-300">
                      Note for our team (optional)
                    </Label>
                    <Textarea
                      id="sc-access-note"
                      value={accessRequestNote}
                      onChange={(e) => setAccessRequestNote(e.target.value)}
                      placeholder="Markets you serve, link to your menu, or anything else that helps us review your store…"
                      className="mt-1 min-h-[100px] border-green-900/40 bg-gray-950 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <Button asChild className="bg-amber-600 hover:bg-amber-700">
                    <a href={accessRequestMailto || undefined}>
                      <Mail className="mr-2 h-4 w-4" />
                      Send request email
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {isClubMember && (
            <>
          <div className="mb-6 md:hidden">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Metrics date range</p>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-full border-green-900/40 bg-gray-950 text-white">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6 hidden flex-wrap items-center justify-between gap-4 md:flex">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <span className="font-medium text-white">Your tree performance</span>
            </div>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[180px] border-green-900/40 bg-gray-950 text-white">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="mb-6 hidden border-green-900/25 bg-gray-900/50 p-6 md:block">
            <h3 className="mb-3 text-sm font-medium text-gray-400">Tree placement</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : hasActiveTreeSlot ? (
              <p className="text-sm text-gray-300">
                You have an active Smokers Club tree listing in at least one market. Specific placement order is managed by
                our team—ask your account manager if you want to discuss visibility.
              </p>
            ) : (
              <p className="text-gray-400">
                You are in Smokers Club, but you do not have an active tree listing in any market right now. Contact your
                account manager to be placed on the tree.
              </p>
            )}
          </Card>

          <Card className="mb-8 border-green-900/25 bg-gray-900/50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-brand-lime" />
              <h3 className="text-lg font-semibold text-white">Smokers Club tree card background</h3>
            </div>
            <p className="mb-4 text-sm text-gray-400">
              Optional wide image behind your tile on the homepage tree. Your logo stays on its own square — this is
              only the backdrop. Admins can also set or clear this from{' '}
              <span className="text-gray-300">Admin → Vendors → Profile</span>.
            </p>
            {!isClubMember ? (
              <p className="text-sm text-gray-500">Join Smokers Club to customize your tree appearance.</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user?.id || !vendor?.id) return;
                  setClubTabBgSaving(true);
                  try {
                    let url: string | null = clubTabBgDraft.trim() || null;
                    if (clubTabBgFile) {
                      const up = await uploadVendorMediaFile(user.id, clubTabBgFile);
                      if ('error' in up) throw new Error(up.error);
                      url = up.url;
                    }
                    const { error } = await supabase
                      .from('vendors')
                      .update({ smokers_club_tab_background_url: url })
                      .eq('id', vendor.id);
                    if (error) throw error;
                    toast({ title: 'Tree background saved' });
                    setClubTabBgFile(null);
                    await refresh();
                  } catch (err: unknown) {
                    toast({
                      title: 'Save failed',
                      description: err instanceof Error ? err.message : 'Unknown error',
                      variant: 'destructive',
                    });
                  } finally {
                    setClubTabBgSaving(false);
                  }
                }}
              >
                <div>
                  <Label className="text-gray-300">Background image file (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-1 border-green-900/40 bg-gray-950 text-gray-300 file:text-gray-400"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) openClubTreeImageFit(f);
                      e.target.value = '';
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-600">Uploading replaces the URL below when you save.</p>
                </div>
                <div>
                  <Label className="text-gray-300">Or image URL</Label>
                  <Input
                    value={clubTabBgDraft}
                    onChange={(e) => setClubTabBgDraft(e.target.value)}
                    disabled={!!clubTabBgFile}
                    placeholder="https://..."
                    className="mt-1 border-green-900/40 bg-gray-950 text-white placeholder:text-gray-600"
                  />
                </div>
                {(clubTabBgPreview || (clubTabBgDraft.trim() && !clubTabBgFile)) && (
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={clubTabBgPreview || clubTabBgDraft.trim()}
                      alt=""
                      className="h-32 w-full object-cover sm:h-40"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={clubTabBgSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {clubTabBgSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save background'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-900/50 text-red-300 hover:bg-red-950/40"
                    disabled={clubTabBgSaving}
                    onClick={async () => {
                      if (!vendor?.id) return;
                      setClubTabBgSaving(true);
                      try {
                        const { error } = await supabase
                          .from('vendors')
                          .update({ smokers_club_tab_background_url: null })
                          .eq('id', vendor.id);
                        if (error) throw error;
                        setClubTabBgDraft('');
                        setClubTabBgFile(null);
                        toast({ title: 'Background removed' });
                        await refresh();
                      } catch (err: unknown) {
                        toast({
                          title: 'Could not clear',
                          description: err instanceof Error ? err.message : 'Unknown error',
                          variant: 'destructive',
                        });
                      } finally {
                        setClubTabBgSaving(false);
                      }
                    }}
                  >
                    Remove background
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="mb-8 hidden max-w-xl border-green-900/25 bg-gray-900/50 p-6 md:block">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Tree click-through rate
            </div>
            <p className="text-4xl font-bold text-green-400">
              {loading ? '—' : treeCtrPercent != null ? `${treeCtrPercent}%` : '—'}
            </p>
            <p className="mt-3 text-sm text-gray-500">
              Share of Smokers Club tree exposure for your shop that led to someone opening your listing. Raw impression
              and click counts are visible to our team only.
            </p>
          </Card>

          <Card className="hidden border-blue-600/25 bg-blue-950/20 p-6 md:block">
            <div className="flex gap-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
              <div>
                <h4 className="mb-2 font-semibold">About this number</h4>
                <p className="text-sm text-gray-300">
                  The <strong className="text-white">click-through rate</strong> is the vendor-facing summary of how often
                  your tree placement turns into a listing visit. Ask your account manager if you want detail on reach or
                  placement.
                </p>
              </div>
            </div>
          </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
