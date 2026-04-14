"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { trackEvent, trackClickEvent } from '@/lib/analytics';
import { readShopperGeo, readShopperZip5 } from '@/lib/shopperLocation';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { mapApproxCenterForShopperZip5 } from '@/lib/mapCoordinates';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import {
  fetchApprovedVendorIdsForMarket,
  fetchVendorCoordsById,
  fetchVendorExtraLocationCoordsByVendorId,
  fetchVendorIdsServingZip5,
} from '@/lib/discoverMarketData';
import { vendorPassesShopperMarketGate } from '@/lib/vendorShopperArea';
import { MapPin, Phone, Globe, Navigation, Heart, Star, Clock, Share2, Flag, CreditCard as Edit, Image as ImageIcon, Tag, MessageCircle, Award, Mail, Info, Trophy, LayoutDashboard } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import { ListingPublicMenu } from '@/components/listing/ListingPublicMenu';
import { REORDER_SESSION_KEY, type ReorderNoticePayload } from '@/lib/customerReorder';
import { vendorRowPublicMenuEnabled } from '@/lib/vendorOnlineMenuPolicy';
import { publicVendorDisplayName, resolveSocialEquityBadgeVisible } from '@/lib/vendorDisplayName';
import { recordDispensaryView } from '@/lib/recentlyViewedDispensaries';
import {
  filterReviewsCreatedNotInFuture,
  publicReviewProfilesFromAuthorBits,
} from '@/lib/vendorReviewDisplay';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { SocialEquityBadge } from '@/components/vendor/SocialEquityBadge';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { sanitizeDisplayImageUrl } from '@/lib/optimizedImageUrl';
import { formatListingAddressForMaps, googleMapsDirectionsUrl } from '@/lib/mapsLinks';
import { resolvePublicVendorServiceModes } from '@/lib/vendorStorefrontDelivery';
import { SITE_NAME } from '@/lib/brand';
import { isVendorListingUuid } from '@/lib/listingPath';
type Business = {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  email: string;
  logo_url: string;
  cover_photo_url: string;
  photos: string[];
  is_verified: boolean;
  plan_type: string;
  /** CannaHub: show menu + cart when true */
  online_menu_enabled?: boolean;
  offers_storefront?: boolean;
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  social_equity_badge_visible?: boolean;
  /** Vendor SKU card theme (vendors schema). */
  sku_card_preset?: string | null;
  sku_card_background_url?: string | null;
  sku_card_overlay_opacity?: number | null;
};

type Review = {
  id: string;
  user_id: string;
  rating: number;
  /** Written body text from `reviews.body` (may be empty for star-only rows). */
  comment: string;
  /** True when `body` has text (controls whether the comment paragraph is shown). */
  hasWrittenComment: boolean;
  created_at: string;
  vendor_reply: string | null;
  vendor_reply_at: string | null;
  /** Seeded / guest reviews: display handle when no linked profile username. */
  guest_handle: string | null;
  profiles: {
    full_name: string;
    username: string | null;
  };
};

type PublicLicense = {
  id: string;
  license_number: string;
  license_type: string;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  verification_status: string;
  document_url: string | null;
};

export default function BusinessListingPage() {
  const params = useParams();
  const listingSegment = decodeURIComponent(String(params.slug ?? '').trim());
  const { user } = useAuth();
  const { isVendor, isAdmin } = useRole();
  const { toast } = useToast();
  const vendorsSchema = useVendorsSchema();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [areaBlocked, setAreaBlocked] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [licenses, setLicenses] = useState<PublicLicense[]>([]);
  /** Smokers Club spotlight trophy tier (1–3) from ZIP proximity on tree; not used for legacy schema. */
  const [smokersClubTrophy, setSmokersClubTrophy] = useState<number | null>(null);

  const isOwner = user && business && user.id === business.user_id;
  const vendorUuid = business?.id ?? null;
  const rankVendorId =
    vendorUuid ?? (listingSegment && isVendorListingUuid(listingSegment) ? listingSegment : null);

  useEffect(() => {
    void loadBusiness();
    // Re-fetch when schema flag or role changes — first paint used wrong table otherwise.
  }, [listingSegment, vendorsSchema, isVendor, isAdmin, user?.id]);

  useEffect(() => {
    if (!vendorUuid) return;
    void loadReviews();
    void loadLicenses();
    void checkFavorite();
    void trackPageView();
  }, [vendorUuid, vendorsSchema, user?.id]);

  useEffect(() => {
    if (!rankVendorId || !vendorsSchema) {
      setSmokersClubTrophy(null);
      return;
    }
    let cancelled = false;
    const loadRank = () => {
      const z = readShopperZip5() ?? FALLBACK_LA_ZIP;
      void (async () => {
        try {
          const res = await fetch(
            `/api/smokers-club/rank?vendorId=${encodeURIComponent(rankVendorId)}&zip=${encodeURIComponent(z)}`,
            { cache: 'no-store' }
          );
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as { trophy_tier?: number | null };
          if (!cancelled)
            setSmokersClubTrophy(typeof data.trophy_tier === 'number' ? data.trophy_tier : null);
        } catch {
          if (!cancelled) setSmokersClubTrophy(null);
        }
      })();
    };
    loadRank();
    window.addEventListener('datreehouse:zip', loadRank);
    window.addEventListener('storage', loadRank);
    return () => {
      cancelled = true;
      window.removeEventListener('datreehouse:zip', loadRank);
      window.removeEventListener('storage', loadRank);
    };
  }, [rankVendorId, vendorsSchema]);

  useEffect(() => {
    if (!vendorUuid) return;
    try {
      const raw = sessionStorage.getItem(REORDER_SESSION_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as ReorderNoticePayload;
      if (p.vendorId !== vendorUuid) return;
      sessionStorage.removeItem(REORDER_SESSION_KEY);
      const unavailable = Array.isArray(p.unavailable) ? p.unavailable : [];
      const addedCount = typeof p.addedCount === 'number' ? p.addedCount : 0;
      if (addedCount > 0 && unavailable.length === 0) {
        toast({
          title: 'Cart updated',
          description: 'We added everything from your past order. Adjust quantities or checkout when ready.',
        });
      } else if (addedCount > 0 && unavailable.length > 0) {
        toast({
          title: 'Some items could not be re-added',
          description: unavailable.join(' · '),
          duration: 14_000,
        });
      } else if (unavailable.length > 0) {
        toast({
          title: 'Nothing from that order is available right now',
          description: unavailable.join(' · '),
          variant: 'destructive',
          duration: 14_000,
        });
      }
    } catch {
      try {
        sessionStorage.removeItem(REORDER_SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [vendorUuid, toast]);

  async function loadBusiness() {
    try {
      setLoading(true);
      setAreaBlocked(false);

      const hydrateFromVendorsRow = async (d: Record<string, unknown>): Promise<void> => {
        const vid = String(d.id ?? '');
        setAreaBlocked(false);
        // Customer-only: ZIP market gate — aligned with Smokers Club (eligible + live + approved license counts as area OK).
        if (!isVendor && !isAdmin) {
          const zip5 = readShopperZip5() ?? FALLBACK_LA_ZIP;
          const market = await getMarketForSmokersClub(zip5);
          let allowed = true;
          if (!market) {
            setAreaBlocked(true);
            allowed = false;
          } else {
            const [approvedIds, ranksRes, vendorIdsServingShopperZip, coordsMap, extrasMap] = await Promise.all([
              fetchApprovedVendorIdsForMarket(market.id),
              fetch(
                `/api/smokers-club/operational-ranks?zip=${encodeURIComponent(zip5)}`,
                { cache: 'no-store' }
              ).then((r) => (r.ok ? r.json() : { ranks: {} })),
              fetchVendorIdsServingZip5(zip5),
              fetchVendorCoordsById(),
              fetchVendorExtraLocationCoordsByVendorId(),
            ]);
            const ranks = (ranksRes as { ranks?: Record<string, number> }).ranks ?? {};
            const onTodaysLadder = typeof ranks[vid] === 'number';
            const strictNonCa =
              market.region_key != null && String(market.region_key) !== 'ca';
            const geo = readShopperGeo();
            const approx = mapApproxCenterForShopperZip5(zip5);
            const rankLat = geo?.lat ?? approx?.lat ?? null;
            const rankLng = geo?.lng ?? approx?.lng ?? null;
            const c = coordsMap.get(vid);
            const ex = extrasMap.get(vid);
            allowed = vendorPassesShopperMarketGate(
              {
                id: vid,
                zip: (d.zip as string | null | undefined) ?? null,
                smokers_club_eligible: d.smokers_club_eligible as boolean | null | undefined,
                is_live: d.is_live as boolean | null | undefined,
                license_status: d.license_status as string | null | undefined,
                billing_delinquent: d.billing_delinquent as boolean | null | undefined,
                geo_lat: c?.geo_lat ?? null,
                geo_lng: c?.geo_lng ?? null,
                map_geo_extra_points:
                  ex && ex.length > 0 ? ex.map((e) => ({ lat: e.lat, lng: e.lng })) : undefined,
              },
              approvedIds,
              onTodaysLadder,
              {
                shopperZip5: zip5,
                vendorIdsServingShopperZip,
                shopperMapLat: rankLat,
                shopperMapLng: rankLng,
              },
              { requireOpsOrTreehouse: strictNonCa }
            );
          }
          if (!allowed) {
            setAreaBlocked(true);
            // Don't block customers from viewing out-of-area listings.
          }
        }

        const contact = String(d.contact_email ?? '').trim();
        const logo = String(d.logo_url ?? '').trim();
        const banner = String(d.banner_url ?? '').trim();
        const photoList: string[] = [];
        if (logo) photoList.push(logo);
        if (banner && !photoList.includes(banner)) photoList.push(banner);

        const modes = resolvePublicVendorServiceModes({
          address: d.address as string | null | undefined,
          city: d.city as string | null | undefined,
          state: d.state as string | null | undefined,
          zip: d.zip as string | null | undefined,
          offers_delivery: d.offers_delivery as boolean | null | undefined,
          offers_storefront: d.offers_storefront as boolean | null | undefined,
          allow_both_storefront_and_delivery: d.allow_both_storefront_and_delivery as boolean | null | undefined,
        });
        setBusiness({
          id: d.id as string,
          user_id: (d.user_id as string) ?? '',
          business_name: publicVendorDisplayName(d.name as string | null | undefined),
          business_type: 'dispensary',
          description: String(d.description ?? d.tagline ?? ''),
          address: String(d.address ?? ''),
          city: String(d.city ?? ''),
          state: String(d.state ?? ''),
          zip_code: String(d.zip ?? ''),
          phone: String(d.phone ?? ''),
          website: String(d.website ?? ''),
          email: contact,
          logo_url: logo,
          cover_photo_url: banner,
          photos: photoList,
          is_verified: Boolean(d.verified),
          plan_type: String(d.subscription_tier ?? 'basic'),
          online_menu_enabled: vendorRowPublicMenuEnabled(d),
          offers_storefront: modes.offers_storefront,
          offers_delivery: modes.offers_delivery,
          social_equity_badge_visible: resolveSocialEquityBadgeVisible(
            d.name as string | null | undefined,
            d.social_equity_badge_visible === true
          ),
          sku_card_preset: (d.sku_card_preset as string | null | undefined) ?? 'default',
          sku_card_background_url: (d.sku_card_background_url as string | null | undefined) ?? null,
          sku_card_overlay_opacity:
            typeof d.sku_card_overlay_opacity === 'number' ? d.sku_card_overlay_opacity : null,
        });
        recordDispensaryView(vid);
      };

      const hydrateFromProfileRow = (row: Business): void => {
        setAreaBlocked(false);
        setBusiness({
          ...row,
          online_menu_enabled: row.online_menu_enabled !== false,
          offers_storefront: row.offers_pickup === true,
          offers_delivery: row.offers_delivery === true,
        });
        recordDispensaryView(row.id);
      };

      const tryVendors = async (): Promise<boolean> => {
        const q = supabase.from('vendors').select('*');
        const { data, error } = isVendorListingUuid(listingSegment)
          ? await q.eq('id', listingSegment).maybeSingle()
          : await q.eq('slug', listingSegment).maybeSingle();
        if (error) {
          console.warn('listing: vendors lookup', error.message);
          return false;
        }
        if (!data) return false;
        await hydrateFromVendorsRow(data as Record<string, unknown>);
        return true;
      };

      const tryProfiles = async (): Promise<boolean> => {
        if (!isVendorListingUuid(listingSegment)) return false;
        const { data, error } = await supabase
          .from('vendor_profiles')
          .select('*')
          .eq('id', listingSegment)
          .maybeSingle();
        if (error) {
          console.warn('listing: vendor_profiles lookup', error.message);
          return false;
        }
        if (!data) return false;
        hydrateFromProfileRow(data as Business);
        return true;
      };

      try {
        const res = await fetch(`/api/public/vendor/${encodeURIComponent(listingSegment)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const payload = (await res.json()) as {
            source?: string;
            row?: Record<string, unknown>;
          };
          if (payload.source === 'vendors' && payload.row) {
            await hydrateFromVendorsRow(payload.row);
            return;
          }
          if (payload.source === 'vendor_profiles' && payload.row) {
            hydrateFromProfileRow(payload.row as Business);
            return;
          }
        }
      } catch {
        /* fall through to anon Supabase */
      }

      let ok = false;
      if (vendorsSchema) {
        ok = await tryVendors();
        if (!ok) ok = await tryProfiles();
      } else {
        ok = await tryProfiles();
        if (!ok) ok = await tryVendors();
      }

      if (!ok) setBusiness(null);
    } catch (error) {
      console.error('Error loading business:', error);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    if (!vendorUuid) return;
    type ReviewDbRow = {
      id: string;
      reviewer_id: string | null;
      rating: number;
      body: string | null;
      title: string | null;
      created_at: string;
      vendor_reply?: string | null;
      vendor_reply_at?: string | null;
      reviewer_display_handle?: string | null;
    };
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          'id, reviewer_id, rating, body, title, created_at, vendor_reply, vendor_reply_at, reviewer_display_handle'
        )
        .eq('entity_type', 'vendor')
        .eq('entity_id', vendorUuid)
        .lte('created_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) throw error;
      const rows = filterReviewsCreatedNotInFuture((data || []) as ReviewDbRow[]);
      const reviewerIds = Array.from(
        new Set(rows.map((r) => r.reviewer_id).filter(Boolean))
      ) as string[];
      const fullNameById = new Map<string, string>();
      const profileUsernameById = new Map<string, string>();
      const userProfilesUsernameById = new Map<string, string>();
      if (reviewerIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', reviewerIds);
        for (const p of profs || []) {
          const id = p.id as string;
          const fn = String((p as { full_name?: string }).full_name || '').trim();
          const un = String((p as { username?: string }).username || '').trim();
          fullNameById.set(id, fn);
          if (un) profileUsernameById.set(id, un);
        }
        const { data: ups } = await supabase.from('user_profiles').select('id, username').in('id', reviewerIds);
        for (const u of ups || []) {
          const un = String((u as { username?: string }).username || '').trim();
          if (un) userProfilesUsernameById.set(u.id as string, un);
        }
      }

      const mapped: Review[] = rows.map((r) => {
        const rid = (r.reviewer_id as string) || '';
        const guest = String(
          (r as { reviewer_display_handle?: string | null }).reviewer_display_handle || ''
        ).trim();
        const rawBody = String((r.body as string) || '').trim();
        const rawTitle = String((r.title as string) || '').trim();
        const hasWrittenComment = rawBody.length > 0;
        const profiles = publicReviewProfilesFromAuthorBits({
          profileUsername: rid ? profileUsernameById.get(rid) ?? null : null,
          secondaryUsername: rid ? userProfilesUsernameById.get(rid) ?? null : null,
          profileFullName: rid ? fullNameById.get(rid) ?? null : null,
          guestHandle: guest || null,
        });
        return {
          id: r.id as string,
          user_id: rid,
          rating: r.rating as number,
          comment: rawBody,
          hasWrittenComment,
          created_at: r.created_at as string,
          vendor_reply: (r as { vendor_reply?: string | null }).vendor_reply ?? null,
          vendor_reply_at: (r as { vendor_reply_at?: string | null }).vendor_reply_at ?? null,
          guest_handle: guest || null,
          profiles,
        };
      });
      setReviews(mapped);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  async function loadLicenses() {
    try {
      if (!vendorsSchema || !vendorUuid) {
        setLicenses([]);
        return;
      }

      const { data, error } = await supabase
        .from('business_licenses')
        .select(
          'id,license_number,license_type,issuing_authority,issue_date,expiry_date,verification_status,document_url'
        )
        .eq('vendor_id', vendorUuid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenses((data || []) as PublicLicense[]);
    } catch (error) {
      console.error('Error loading licenses:', error);
      setLicenses([]);
    }
  }

  async function checkFavorite() {
    if (!user || !vendorUuid) return;

    try {
      if (vendorsSchema) {
        const { data, error } = await supabase
          .from('favorites')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('entity_type', 'vendor')
          .eq('entity_id', vendorUuid)
          .maybeSingle();

        if (error) throw error;
        setIsFavorite(!!data);
        return;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('service_id', vendorUuid)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  }

  async function trackPageView() {
    if (!vendorUuid) return;
    await trackEvent({
      eventType: 'listing_view',
      vendorId: vendorUuid,
      metadata: { source: 'direct' }
    });
  }

  async function handleToggleFavorite() {
    if (!vendorUuid) return;
    if (!user) {
      toast({
        title: 'Sign in to save',
        description: 'Create an account or sign in to add this shop to your saved list.',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('datreehouse:open-auth'));
      }
      return;
    }

    try {
      if (vendorsSchema) {
        if (isFavorite) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('entity_type', 'vendor')
            .eq('entity_id', vendorUuid);
          if (error) throw error;
          await trackEvent({ eventType: 'favorite_removed', vendorId: vendorUuid });
          setIsFavorite(false);
          toast({ title: 'Removed from saved' });
        } else {
          const { error } = await supabase.from('favorites').insert({
            user_id: user.id,
            entity_type: 'vendor',
            entity_id: vendorUuid,
          });
          if (error) throw error;
          await trackEvent({ eventType: 'favorite_saved', vendorId: vendorUuid });
          setIsFavorite(true);
          toast({ title: 'Saved', description: 'We added this shop to your saved list.' });
        }
        return;
      }

      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('service_id', vendorUuid);
        if (error) throw error;
        await trackEvent({ eventType: 'favorite_removed', vendorId: vendorUuid });
        setIsFavorite(false);
        toast({ title: 'Removed from saved' });
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          service_id: vendorUuid,
        });
        if (error) throw error;
        await trackEvent({ eventType: 'favorite_saved', vendorId: vendorUuid });
        setIsFavorite(true);
        toast({ title: 'Saved', description: 'We added this shop to your saved list.' });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Could not update saved list',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    }
  }

  async function handlePhoneClick() {
    if (!vendorUuid) return;
    await trackClickEvent(vendorUuid, 'phone', { phone: business?.phone });
    await trackEvent({
      eventType: 'phone_click',
      vendorId: vendorUuid
    });
  }

  async function handleWebsiteClick() {
    if (!vendorUuid) return;
    await trackClickEvent(vendorUuid, 'website', { website: business?.website });
    await trackEvent({
      eventType: 'website_click',
      vendorId: vendorUuid
    });
  }

  function destinationLineForMaps(): string | null {
    if (!business) return null;
    const contactOnly = Boolean(vendorsSchema && !isOwner && business.online_menu_enabled === false);
    const showStreet = business.offers_storefront === true && Boolean(business.address?.trim());
    if (contactOnly && !showStreet) {
      const parts = [business.city, business.state, business.zip_code].filter(
        (x) => typeof x === 'string' && x.trim() !== ''
      );
      return parts.length ? parts.join(', ') : null;
    }
    return formatListingAddressForMaps(business);
  }

  async function handleDirectionsClick() {
    if (!vendorUuid) return;
    const dest = destinationLineForMaps();
    const mapsUrl = dest ? googleMapsDirectionsUrl(dest) : null;
    await trackClickEvent(vendorUuid, 'directions', {
      address: business?.address,
      city: business?.city,
    });
    await trackEvent({
      eventType: 'directions_click',
      vendorId: vendorUuid,
    });
    if (mapsUrl) {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Directions unavailable',
        description: 'This listing does not have enough location detail to open maps.',
        variant: 'destructive',
      });
    }
  }

  async function handleShareClick() {
    if (!business || typeof window === 'undefined') return;
    const url = window.location.href;
    const title = business.business_name?.trim() || 'Dispensary';
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Check out ${title} on ${SITE_NAME}`,
          url,
        });
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Paste anywhere to share this listing.' });
    } catch {
      toast({
        title: 'Could not copy link',
        description: 'Copy the address from your browser’s address bar.',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmitReview() {
    if (!user) {
      toast({
        title: 'Sign in to review',
        description: 'Create an account or sign in to leave a review.',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('datreehouse:open-auth'));
      }
      return;
    }

    if (!newReview.comment || newReview.rating < 1) {
      alert('Please provide a rating and comment');
      return;
    }

    if (!vendorUuid) return;

    try {
      setSubmittingReview(true);

      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        entity_type: 'vendor',
        entity_id: vendorUuid,
        rating: newReview.rating,
        title: 'Review',
        body: newReview.comment.trim(),
      });

      if (error) {
        toast({
          title: 'Could not post review',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      await trackEvent({
        eventType: 'review_submitted',
        vendorId: vendorUuid,
        metadata: { rating: newReview.rating },
      });

      toast({ title: 'Review posted', description: 'Thanks for sharing your experience.' });
      setNewReview({ rating: 5, comment: '' });
      await loadReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Could not post review',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-zinc-200">Loading…</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{areaBlocked ? 'Not Available in Your Area' : 'Business Not Found'}</h1>
          <p className="mb-4 text-zinc-200">
            {areaBlocked ? 'Not available in your area.' : 'Not found.'}
          </p>
          <Link href="/map">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Browse All Businesses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const publicContactOnly =
    vendorsSchema && !isOwner && business.online_menu_enabled === false;
  const showStorefrontAddress =
    business.offers_storefront === true && Boolean(business.address?.trim());

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-br from-green-950/50 to-black border-b border-green-900/20">
        {business.cover_photo_url && (
          <img
            src={sanitizeDisplayImageUrl(business.cover_photo_url)}
            alt={business.business_name}
            className="w-full h-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        {/* Business Header */}
        <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-950/40">
              {business.logo_url ? (
                <OptimizedImg
                  src={business.logo_url}
                  alt={business.business_name}
                  className="h-full w-full object-contain object-center"
                  preset="logo"
                />
              ) : (
                <span className="text-4xl font-bold text-green-500">
                  {(business.business_name.trim().charAt(0) || '?').toUpperCase()}
                </span>
              )}
            </div>

            {/* Business Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold text-white">{business.business_name}</h1>
                    {business.social_equity_badge_visible && <SocialEquityBadge />}
                    {smokersClubTrophy != null && (
                      <Badge
                        className={
                          smokersClubTrophy === 1
                            ? 'border-amber-400/70 bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-500 hover:to-amber-600'
                            : smokersClubTrophy === 2
                              ? 'border-slate-400/50 bg-slate-700/40 text-slate-100'
                              : 'border-amber-800/45 bg-amber-950/55 text-amber-100'
                        }
                      >
                        <Trophy className="mr-1 h-3 w-3 shrink-0" aria-hidden />
                        <span className="sr-only">
                          Smokers Club spotlight near your ZIP (
                          {smokersClubTrophy === 1 ? 'gold' : smokersClubTrophy === 2 ? 'silver' : 'bronze'} tier)
                        </span>
                        <span aria-hidden>Smokers Club</span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {business.is_verified && (
                      <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                        <Award className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {business.plan_type !== 'basic' && (
                      <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30">
                        {business.plan_type.toUpperCase()}
                      </Badge>
                    )}
                    <Badge className="bg-gray-700/50 text-gray-300 border-gray-600/30 capitalize">
                      {business.business_type}
                    </Badge>
                  </div>
                </div>

                {vendorsSchema && user && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isAdmin ? (
                      <>
                        <Link href={withAdminVendorQuery('/vendor/dashboard', business.id)}>
                          <Button
                            variant="outline"
                            className="border-amber-600/45 text-amber-100 hover:bg-amber-950/50"
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Vendor dashboard
                          </Button>
                        </Link>
                        <Link href={withAdminVendorQuery('/vendor/profile', business.id)}>
                          <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit listing
                          </Button>
                        </Link>
                      </>
                    ) : isOwner ? (
                      <Link href="/vendor/profile">
                        <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Listing
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= averageRating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-gray-400">({reviews.length} reviews)</span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-gray-300 mb-4">
                <MapPin className="h-5 w-5 text-green-500" />
                <span>
                  {publicContactOnly
                    ? showStorefrontAddress
                      ? `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`.trim()
                      : [business.city, business.state, business.zip_code].filter(Boolean).join(', ')
                    : `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`}
                </span>
              </div>

              {publicContactOnly && (
                <p className="mb-4 rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100/90">
                  Online ordering and the product menu are turned off for this shop. Use the contact options below.
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {business.phone && (
                  <a href={`tel:${business.phone}`} onClick={handlePhoneClick}>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </a>
                )}
                {publicContactOnly && destinationLineForMaps() ? (
                  <Button
                    type="button"
                    onClick={() => void handleDirectionsClick()}
                    variant="outline"
                    className="border-green-900/20 text-white hover:bg-green-500/10"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                ) : null}
                {publicContactOnly && business.email && (
                  <a href={`mailto:${business.email}`}>
                    <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </a>
                )}
                {!publicContactOnly && (
                  <>
                    <Button
                      type="button"
                      onClick={() => void handleDirectionsClick()}
                      variant="outline"
                      className="border-green-900/20 text-white hover:bg-green-500/10"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                    {business.website && (
                      <a href={business.website} target="_blank" rel="noopener noreferrer" onClick={handleWebsiteClick}>
                        <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </Button>
                      </a>
                    )}
                  </>
                )}
                <Button
                  onClick={() => void handleToggleFavorite()}
                  variant="outline"
                  className="border-green-900/20 text-white hover:bg-green-500/10"
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                  {isFavorite ? 'Saved' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-green-900/20 text-white hover:bg-green-500/10"
                  onClick={() => void handleShareClick()}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Content Tabs */}
        <Tabs
          key={business.id}
          defaultValue={publicContactOnly ? 'overview' : 'menu'}
          className="space-y-6"
        >
          <TabsList className="flex flex-wrap gap-1 bg-gray-900 border border-green-900/20">
            {!publicContactOnly && <TabsTrigger value="menu">Menu</TabsTrigger>}
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {!publicContactOnly && (
            <TabsContent value="menu" className="space-y-6">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Shop menu</h2>
                <ListingPublicMenu
                  vendorId={business.id}
                  vendorName={business?.business_name?.trim() || 'This shop'}
                  vendorState={business?.state ?? null}
                  skuCardTheme={
                    business
                      ? {
                          preset: business.sku_card_preset,
                          backgroundUrl: business.sku_card_background_url,
                          overlayOpacity: business.sku_card_overlay_opacity,
                        }
                      : null
                  }
                />
              </Card>
            </TabsContent>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">About This Business</h2>
              <p className="text-gray-300 leading-relaxed">
                {business.description || 'Premium cannabis products and services available.'}
              </p>
            </Card>

            {/* Contact Info */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
              <div className="space-y-3">
                {business.phone && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone className="h-5 w-5 text-green-500" />
                    <a href={`tel:${business.phone}`} className="hover:text-white" onClick={handlePhoneClick}>
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail className="h-5 w-5 text-green-500" />
                    <a href={`mailto:${business.email}`} className="hover:text-white">
                      {business.email}
                    </a>
                  </div>
                )}
                {(publicContactOnly ? showStorefrontAddress : true) && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin className="h-5 w-5 text-green-500" />
                    <span>
                      {publicContactOnly && showStorefrontAddress
                        ? `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`.trim()
                        : publicContactOnly
                          ? [business.city, business.state, business.zip_code].filter(Boolean).join(', ')
                          : `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`}
                    </span>
                  </div>
                )}
                {!publicContactOnly && business.website && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Globe className="h-5 w-5 text-green-500" />
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                      onClick={handleWebsiteClick}
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Licenses</h2>
              {licenses.length === 0 ? (
                <p className="text-zinc-300">No licenses on file.</p>
              ) : (
                <div className="space-y-3">
                  {licenses.map((lic) => (
                    <div key={lic.id} className="rounded-lg border border-gray-800 bg-black/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-green-700/40 bg-green-950/40 text-green-200">
                            {lic.license_type || 'License'}
                          </Badge>
                          <Badge variant="outline" className="border-gray-700 text-gray-300">
                            {lic.verification_status || 'pending'}
                          </Badge>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-700/80 bg-gradient-to-br from-gray-900 to-black text-gray-400 shadow-sm transition-colors hover:border-green-600/40 hover:text-green-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40"
                              aria-label="View license number"
                            >
                              <Info className="h-4 w-4" strokeWidth={2.25} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="w-[min(92vw,280px)] border-gray-800 bg-gray-950 p-3 text-white shadow-lg"
                          >
                            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                              License number
                            </p>
                            <p className="mt-1 break-all font-mono text-sm text-white">
                              {lic.license_number?.trim() || 'Not on file'}
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        {[lic.issuing_authority, lic.issue_date, lic.expiry_date ? `Expires ${lic.expiry_date}` : null]
                          .filter(Boolean)
                          .join(' · ') || 'No additional details'}
                      </p>
                      {lic.document_url && (
                        <a
                          href={lic.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-green-400 hover:text-green-300"
                        >
                          View license document
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            {user && !isOwner && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Write a Review</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className="transition hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= newReview.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">Your Review</label>
                    <Textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      placeholder="Share your experience..."
                      rows={4}
                      className="bg-gray-800 border-green-900/20 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Reviews list: star-only rows still appear (reviewer + stars); written body when present. */}
            {reviews.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
                <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Reviews Yet</h3>
                <p className="text-gray-400">Be the first to review this business!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                    <div
                      className={`flex items-start justify-between ${review.hasWrittenComment || (review.vendor_reply && review.vendor_reply.trim() !== '') ? 'mb-3' : ''}`}
                    >
                      <div>
                        <p className="text-white font-semibold">
                          {review.profiles.username ? (
                            <Link
                              href={`/profile/${encodeURIComponent(review.profiles.username)}`}
                              className="hover:text-green-400 hover:underline"
                            >
                              @{review.profiles.username}
                            </Link>
                          ) : review.guest_handle ? (
                            <span>{review.guest_handle}</span>
                          ) : (
                            review.profiles.full_name
                          )}
                        </p>
                        <p className="text-gray-400 text-sm">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.hasWrittenComment ? (
                      <p className="text-gray-300">{review.comment}</p>
                    ) : null}
                    {review.vendor_reply && review.vendor_reply.trim() !== '' && (
                      <div className="mt-4 rounded-lg border border-green-800/40 bg-green-950/25 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-green-500/90">Response from the store</p>
                        <p className="mt-1 text-sm text-gray-200">{review.vendor_reply}</p>
                        {review.vendor_reply_at && (
                          <p className="mt-2 text-xs text-gray-500">
                            {new Date(review.vendor_reply_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Photos Tab — includes mirrored store logo (and banner when present) */}
          <TabsContent value="photos">
            {business.photos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {business.photos.map((url, i) => (
                  <Card
                    key={`${url}-${i}`}
                    className="overflow-hidden border-0 bg-background shadow-none ring-0"
                  >
                    <div className="aspect-square overflow-hidden bg-background">
                      <OptimizedImg
                        src={url}
                        alt=""
                        className="h-full w-full object-cover object-center"
                        preset="card"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-12 text-center">
                <ImageIcon className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h3 className="mb-2 text-xl font-bold text-white">No photos yet</h3>
                <p className="text-gray-400">Store imagery will show here when added.</p>
              </Card>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Business Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-2">Type</h3>
                  <p className="text-gray-300 capitalize">{business.business_type}</p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Plan</h3>
                  <p className="text-gray-300 capitalize">{business.plan_type}</p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Location</h3>
                  <p className="text-gray-300">
                    {business.city}, {business.state}
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Verification</h3>
                  <p className="text-gray-300">
                    {business.is_verified ? 'Verified Business' : 'Pending Verification'}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
