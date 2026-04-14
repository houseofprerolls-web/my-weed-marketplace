"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { trackEvent, trackClickEvent } from '@/lib/analytics';
import { readShopperZip5 } from '@/lib/shopperLocation';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { fetchApprovedVendorIdsForMarket, fetchTreehouseRanksForMarket } from '@/lib/discoverMarketData';
import { MapPin, Phone, Globe, Navigation, Heart, Star, Clock, Share2, Flag, CreditCard as Edit, Image as ImageIcon, Tag, MessageCircle, Award, Mail } from 'lucide-react';
import Link from 'next/link';
import { ListingPublicMenu } from '@/components/listing/ListingPublicMenu';
import { REORDER_SESSION_KEY, type ReorderNoticePayload } from '@/lib/customerReorder';
import { vendorRowPublicMenuEnabled } from '@/lib/vendorOnlineMenuPolicy';

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
  offers_pickup?: boolean;
};

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  vendor_reply: string | null;
  vendor_reply_at: string | null;
  profiles: {
    full_name: string;
  };
};

export default function BusinessListingPage() {
  const params = useParams();
  const businessId = params.id as string;
  const { user } = useAuth();
  const { isVendor, isAdmin } = useRole();
  const { toast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [areaBlocked, setAreaBlocked] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const isOwner = user && business && user.id === business.user_id;

  useEffect(() => {
    loadBusiness();
    loadReviews();
    checkFavorite();
    trackPageView();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    try {
      const raw = sessionStorage.getItem(REORDER_SESSION_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as ReorderNoticePayload;
      if (p.vendorId !== businessId) return;
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
  }, [businessId, toast]);

  async function loadBusiness() {
    try {
      if (isVendorsSchema()) {
        const { data, error } = await supabase.from('vendors').select('*').eq('id', businessId).single();
        if (error) throw error;
        if (data) {
          setAreaBlocked(false);
          // Customer-only: hide stores not approved in the current shopper "Areas" market.
          // Exception: if the store is on the Smokers Club feature lane, allow it.
          if (!isVendor && !isAdmin) {
            const zip5 = readShopperZip5() ?? FALLBACK_LA_ZIP;
            const market = await getMarketForSmokersClub(zip5);
            if (!market) {
              setAreaBlocked(true);
              setBusiness(null);
              return;
            }
            const [approvedIds, treehouseRanks] = await Promise.all([
              fetchApprovedVendorIdsForMarket(market.id),
              fetchTreehouseRanksForMarket(market.id),
            ]);
            const allowed = approvedIds.has(businessId) || treehouseRanks.has(businessId);
            if (!allowed) {
              setAreaBlocked(true);
              setBusiness(null);
              return;
            }
          }

          const d = data as Record<string, unknown>;
          const contact = String(d.contact_email ?? '').trim();
          setBusiness({
            id: d.id as string,
            user_id: (d.user_id as string) ?? '',
            business_name: String(d.name ?? ''),
            business_type: 'dispensary',
            description: String(d.description ?? d.tagline ?? ''),
            address: String(d.address ?? ''),
            city: String(d.city ?? ''),
            state: String(d.state ?? ''),
            zip_code: String(d.zip ?? ''),
            phone: String(d.phone ?? ''),
            website: String(d.website ?? ''),
            email: contact,
            logo_url: String(d.logo_url ?? ''),
            cover_photo_url: String(d.banner_url ?? ''),
            photos: [],
            is_verified: Boolean(d.verified),
            plan_type: String(d.subscription_tier ?? 'basic'),
            online_menu_enabled: vendorRowPublicMenuEnabled(d),
            offers_storefront: (d.offers_storefront as boolean | undefined) !== false,
          });
        }
        return;
      }

      const { data, error } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      const row = data as Business;
      setBusiness({
        ...row,
        online_menu_enabled: row.online_menu_enabled !== false,
        offers_storefront: row.offers_pickup !== false,
      });
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, reviewer_id, rating, body, title, created_at, vendor_reply, vendor_reply_at')
        .eq('entity_type', 'vendor')
        .eq('entity_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const rows = data || [];
      const reviewerIds = Array.from(
        new Set(rows.map((r) => r.reviewer_id).filter(Boolean))
      ) as string[];
      const nameById = new Map<string, string>();
      if (reviewerIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', reviewerIds);
        for (const p of profs || []) {
          nameById.set(p.id as string, String((p as { full_name?: string }).full_name || '').trim() || 'Customer');
        }
      }

      const mapped: Review[] = rows.map((r) => ({
        id: r.id as string,
        user_id: (r.reviewer_id as string) || '',
        rating: r.rating as number,
        comment: String((r.body as string) || (r.title as string) || '').trim(),
        created_at: r.created_at as string,
        vendor_reply: (r as { vendor_reply?: string | null }).vendor_reply ?? null,
        vendor_reply_at: (r as { vendor_reply_at?: string | null }).vendor_reply_at ?? null,
        profiles: {
          full_name:
            r.reviewer_id && nameById.has(r.reviewer_id as string)
              ? nameById.get(r.reviewer_id as string)!
              : 'Customer',
        },
      }));
      setReviews(mapped);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  async function checkFavorite() {
    if (!user) return;

    try {
      if (isVendorsSchema()) {
        const { data, error } = await supabase
          .from('favorites')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('entity_type', 'vendor')
          .eq('entity_id', businessId)
          .maybeSingle();

        if (error) throw error;
        setIsFavorite(!!data);
        return;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('service_id', businessId)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  }

  async function trackPageView() {
    await trackEvent({
      eventType: 'listing_view',
      vendorId: businessId,
      metadata: { source: 'direct' }
    });
  }

  async function handleToggleFavorite() {
    if (!user) {
      window.location.href = '/account?action=login';
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('service_id', businessId);

        await trackEvent({
          eventType: 'favorite_removed',
          vendorId: businessId
        });

        setIsFavorite(false);
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            service_id: businessId
          });

        await trackEvent({
          eventType: 'favorite_saved',
          vendorId: businessId
        });

        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  async function handlePhoneClick() {
    await trackClickEvent(businessId, 'phone', { phone: business?.phone });
    await trackEvent({
      eventType: 'phone_click',
      vendorId: businessId
    });
  }

  async function handleWebsiteClick() {
    await trackClickEvent(businessId, 'website', { website: business?.website });
    await trackEvent({
      eventType: 'website_click',
      vendorId: businessId
    });
  }

  async function handleDirectionsClick() {
    await trackClickEvent(businessId, 'directions', {
      address: business?.address,
      city: business?.city
    });
    await trackEvent({
      eventType: 'directions_click',
      vendorId: businessId
    });
  }

  async function handleSubmitReview() {
    if (!user) {
      window.location.href = '/account?action=login';
      return;
    }

    if (!newReview.comment || newReview.rating < 1) {
      alert('Please provide a rating and comment');
      return;
    }

    try {
      setSubmittingReview(true);

      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        entity_type: 'vendor',
        entity_id: businessId,
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
        vendorId: businessId,
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{areaBlocked ? 'Not Available in Your Area' : 'Business Not Found'}</h1>
          <p className="text-gray-400 mb-4">
            {areaBlocked ? 'This shop is not enabled for your ZIP market (except on Smokers Club feature placements).' : 'This business listing does not exist'}
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
    isVendorsSchema() && !isOwner && business.online_menu_enabled === false;
  const showStorefrontAddress =
    (business.offers_storefront !== false) && Boolean(business.address?.trim());

  return (
    <div className="min-h-screen bg-black">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-br from-green-950/50 to-black border-b border-green-900/20">
        {business.cover_photo_url && (
          <img
            src={business.cover_photo_url}
            alt={business.business_name}
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        {/* Business Header */}
        <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="w-32 h-32 bg-green-900/30 rounded-lg flex items-center justify-center border-2 border-green-600/30 flex-shrink-0">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-4xl font-bold text-green-500">
                  {business.business_name.charAt(0)}
                </span>
              )}
            </div>

            {/* Business Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{business.business_name}</h1>
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

                {isOwner && (
                  <Link href="/vendor/profile">
                    <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Listing
                    </Button>
                  </Link>
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
                      onClick={handleDirectionsClick}
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
                  onClick={handleToggleFavorite}
                  variant="outline"
                  className="border-green-900/20 text-white hover:bg-green-500/10"
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                  {isFavorite ? 'Saved' : 'Save'}
                </Button>
                {!publicContactOnly && (
                  <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Content Tabs */}
        <Tabs
          key={businessId}
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
                <h2 className="text-2xl font-bold text-white mb-1">Shop menu</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Filter by product type and sort to find what you want. Availability follows what the store has listed.
                </p>
                <ListingPublicMenu
                  vendorId={businessId}
                  vendorName={business?.business_name?.trim() || 'This shop'}
                  vendorState={business?.state ?? null}
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

            {/* Reviews List */}
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
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-semibold">{review.profiles.full_name || 'Anonymous'}</p>
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
                    <p className="text-gray-300">{review.comment}</p>
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

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
              <ImageIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Photos Yet</h3>
              <p className="text-gray-400">Photos will be displayed here</p>
            </Card>
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
