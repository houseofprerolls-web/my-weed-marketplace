'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { VendorNav } from '@/components/vendor/VendorNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Award, ImagePlus, Info, Loader2, Mail, Sparkles, TrendingUp } from 'lucide-react';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SMOKERS_CLUB_SLOT_RANK_MAX, SMOKERS_CLUB_SLOT_RANK_MIN } from '@/lib/smokersClub';
import { useToast } from '@/hooks/use-toast';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { HOMEPAGE_BANNER_PRESETS, homepageBannerPresetClass, type HomepageBannerRow } from '@/lib/smokersClubHomepageBanners';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [treeSlotRank, setTreeSlotRank] = useState<number | null>(null);
  /** Vendors only see this derived rate, not raw impression/click counts. */
  const [treeCtrPercent, setTreeCtrPercent] = useState<number | null>(null);
  const [myBanners, setMyBanners] = useState<HomepageBannerRow[]>([]);
  const [bannerPreset, setBannerPreset] = useState<string>(HOMEPAGE_BANNER_PRESETS[0].value);
  const [bannerLink, setBannerLink] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [bannerSubmitting, setBannerSubmitting] = useState(false);
  const [accessRequestNote, setAccessRequestNote] = useState('');

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
      setTreeSlotRank(null);
      setTreeCtrPercent(null);
      setLoading(false);
      return;
    }
    if (vendor.smokers_club_eligible !== true) {
      setTreeSlotRank(null);
      setTreeCtrPercent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const vid = vendor.id;

    const [evRes, listingsRes] = await Promise.all([
      Promise.all([
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
      ]),
      supabase
        .from('vendor_market_listings')
        .select('slot_rank')
        .eq('vendor_id', vid)
        .eq('active', true)
        .eq('club_lane', 'treehouse')
        .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
        .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX),
    ]);

    const imp = evRes[0];
    const clk = evRes[1];
    const impN = !imp.error && typeof imp.count === 'number' ? imp.count : null;
    const clkN = !clk.error && typeof clk.count === 'number' ? clk.count : null;
    setTreeCtrPercent(
      impN != null && clkN != null && impN > 0 ? Math.round((clkN / impN) * 1000) / 10 : null
    );

    const ranks = (listingsRes.data || []).map((r) => r.slot_rank as number);
    setTreeSlotRank(ranks.length ? Math.min(...ranks) : null);

    setLoading(false);
  }, [vendor?.id, vendor?.smokers_club_eligible, vendorsMode, since]);

  const loadBanners = useCallback(async () => {
    if (!vendor?.id || vendor.smokers_club_eligible !== true) {
      setMyBanners([]);
      return;
    }
    const { data, error } = await supabase
      .from('smokers_club_homepage_banners')
      .select('id,vendor_id,image_url,link_url,slot_preset,status,admin_note,created_at')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });
    if (!error && data) setMyBanners(data as HomepageBannerRow[]);
  }, [vendor?.id, vendor?.smokers_club_eligible]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(bannerFile);
    setBannerPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bannerFile]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell || !vendorsMode || !vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-center text-white">
        <p className="text-gray-400">Sign in with a linked dispensary to view Smokers Club.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <VendorNav />

      <div className="ml-0 flex-1 md:ml-64">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold lowercase md:normal-case">Smokers club</h1>
            <p className="text-gray-400">
              {isClubMember
                ? 'Your numbered tree slot and tree click-through rate—how well your club placement turns attention into visits.'
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
                  Numbered rungs on Discover—higher slots show first. Our team places shops per market.
                </p>
              </div>
              {isClubMember ? (
                <>
                  <div className={CLUB_TILE}>
                    <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                    <h2 className="font-semibold text-white">Your rung</h2>
                    {loading ? (
                      <Loader2 className="mt-4 h-6 w-6 animate-spin text-gray-500" aria-hidden />
                    ) : treeSlotRank != null ? (
                      <>
                        <p className="mt-3 text-3xl font-bold text-white">#{treeSlotRank}</p>
                        <Badge variant="outline" className="mt-2 w-fit border-amber-500/40 text-amber-200">
                          {treeSlotRank <= 3 ? 'Prime band' : treeSlotRank <= 6 ? 'Mid tree' : 'Lower rung'}
                        </Badge>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-gray-400">
                        No active tree slot right now—contact your account manager.
                      </p>
                    )}
                  </div>
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
                    <h2 className="font-semibold text-white">Spotlight banner</h2>
                    <p className="mt-2 text-sm text-gray-400">Upload below—admin approves before it runs under the tree.</p>
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
                      The club is the branded tree on the homepage: up to ten shops per market, each on a numbered rung.
                      Lower numbers hang higher and get seen first. When someone taps your card, they go straight to your
                      listing, menu, and checkout. It is a curated spotlight our team places by market—you see how well that
                      placement converts via <strong className="text-gray-200">tree click-through</strong> (we keep raw reach
                      numbers internal).
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
                      <li>Prime homepage real estate next to other top shops in your area</li>
                      <li>{`Clear placement tier (#1–#${SMOKERS_CLUB_SLOT_RANK_MAX}) so you know how high you hang`}</li>
                      <li>Tree click-through rate so you can judge engagement without volume noise</li>
                      <li>Optional homepage spotlight banner (shapes you pick) after admin approval—rotation favors higher tree slots</li>
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
                      curated set of shops per market, each on a numbered rung so shoppers see the best placements first.
                      It drives discovery straight into your listing, menu, and checkout.
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
                      <li>High-intent visibility next to other top shops in your area</li>
                      <li>Team-managed markets, delivery, and storefront lanes</li>
                      <li>Optional spotlight creatives on the homepage once you are in the club</li>
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
            <h3 className="mb-3 text-sm font-medium text-gray-400">Current placement</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : treeSlotRank != null ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-2xl font-bold text-white">
                  Tree slot <span className="text-brand-lime">#{treeSlotRank}</span>
                </p>
                <Badge variant="outline" className="border-amber-500/40 text-amber-200">
                  {treeSlotRank <= 3 ? 'Prime band' : treeSlotRank <= 6 ? 'Mid tree' : 'Lower rung'}
                </Badge>
                <p className="w-full text-sm text-gray-500">
                  Shoppers browsing the Smokers Club tree for your market see your shop at this rung. Moving up means
                  more above-the-fold visibility on the homepage.
                </p>
              </div>
            ) : (
              <p className="text-gray-400">
                You are in Smokers Club, but you do not have an active tree slot in any market right now. Contact your
                account manager to be placed on the tree.
              </p>
            )}
          </Card>

          <Card className="mb-8 border-green-900/25 bg-gray-900/50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-brand-lime" />
              <h3 className="text-lg font-semibold text-white">Homepage spotlight banner</h3>
            </div>
                <p className="mb-4 text-sm text-gray-400">
                  Upload creative for the rotating strip under the tree. Pick a shape preset so your art fits the slot.
                  Our team approves before it goes live. Higher tree slots automatically get longer time on screen in the
                  slideshow. You can have up to three pending submissions; only one banner can be live at a time.
                </p>
                {myBanners.length > 0 && (
                  <ul className="mb-4 space-y-2 border-b border-green-900/20 pb-4">
                    {myBanners.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge
                          variant="outline"
                          className={
                            b.status === 'approved'
                              ? 'border-green-600 text-green-400'
                              : b.status === 'pending'
                                ? 'border-amber-600 text-amber-200'
                                : b.status === 'rejected'
                                  ? 'border-red-600 text-red-300'
                                  : 'border-gray-600 text-gray-400'
                          }
                        >
                          {b.status}
                        </Badge>
                        <span className="text-gray-500">{b.slot_preset}</span>
                        {b.status === 'rejected' && b.admin_note && (
                          <span className="text-xs text-gray-500">— {b.admin_note}</span>
                        )}
                        {b.status === 'pending' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-400 hover:text-red-300"
                            onClick={async () => {
                              const { error } = await supabase.from('smokers_club_homepage_banners').delete().eq('id', b.id);
                              if (error) {
                                toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
                              } else {
                                toast({ title: 'Submission withdrawn' });
                                void loadBanners();
                              }
                            }}
                          >
                            Withdraw
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {myBanners.filter((b) => b.status === 'pending').length >= 3 ? (
                  <p className="text-sm text-amber-200/90">You already have three pending banners. Wait for review or withdraw one.</p>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!user?.id || !vendor?.id || !bannerFile) {
                        toast({ title: 'Choose an image file', variant: 'destructive' });
                        return;
                      }
                      setBannerSubmitting(true);
                      try {
                        const up = await uploadVendorMediaFile(user.id, bannerFile);
                        if ('error' in up) throw new Error(up.error);
                        const { error } = await supabase.from('smokers_club_homepage_banners').insert({
                          vendor_id: vendor.id,
                          image_url: up.url,
                          link_url: bannerLink.trim() || null,
                          slot_preset: bannerPreset,
                          status: 'pending',
                        });
                        if (error) throw error;
                        toast({ title: 'Submitted for review', description: 'We will notify you when it is approved.' });
                        setBannerFile(null);
                        setBannerLink('');
                        void loadBanners();
                      } catch (err: unknown) {
                        toast({
                          title: 'Submit failed',
                          description: err instanceof Error ? err.message : 'Unknown error',
                          variant: 'destructive',
                        });
                      } finally {
                        setBannerSubmitting(false);
                      }
                    }}
                  >
                    <div>
                      <Label className="text-gray-300">Banner image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        className="mt-1 border-green-900/40 bg-gray-950 text-gray-300 file:text-gray-400"
                        onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Shape / size preset</Label>
                      <Select value={bannerPreset} onValueChange={setBannerPreset}>
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
                    {bannerPreviewUrl && (
                      <div className={`mx-auto overflow-hidden rounded-lg border border-white/10 ${homepageBannerPresetClass(bannerPreset)}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={bannerPreviewUrl} alt="" className="h-full w-full object-contain" />
                      </div>
                    )}
                    <div>
                      <Label className="text-gray-300">Click-through URL (optional)</Label>
                      <Input
                        value={bannerLink}
                        onChange={(e) => setBannerLink(e.target.value)}
                        placeholder="https://… (optional — defaults to your listing)"
                        className="mt-1 border-green-900/40 bg-gray-950 text-white placeholder:text-gray-600"
                      />
                      <p className="mt-1 text-xs text-gray-600">Leave blank to use your public listing page.</p>
                    </div>
                    <Button type="submit" disabled={bannerSubmitting || !bannerFile} className="bg-green-600 hover:bg-green-700">
                      {bannerSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for approval'}
                    </Button>
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
                  Your <strong className="text-white">slot</strong> (#1 is highest on the tree) shapes how prominent you are
                  on the homepage. The <strong className="text-white">click-through rate</strong> is the vendor-facing
                  summary of how often that placement turns into a listing visit. Ask your account manager if you want
                  detail on reach or to move up a rung.
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
