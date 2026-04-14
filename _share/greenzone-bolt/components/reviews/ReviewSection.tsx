"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, Camera, CircleCheck as CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Review = {
  id: string;
  rating: number;
  title: string;
  review_text: string | null;
  photo_urls: string[];
  effects: string[];
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  user_profiles: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
  products: {
    name: string;
  } | null;
};

type ReviewSectionProps = {
  serviceId: string;
  averageRating: number;
  totalReviews: number;
};

export function ReviewSection({ serviceId, averageRating, totalReviews }: ReviewSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    title: '',
    review_text: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [serviceId]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews_enhanced')
        .select(`
          id,
          rating,
          title,
          review_text,
          photo_urls,
          effects,
          helpful_count,
          verified_purchase,
          created_at,
          user_profiles!product_reviews_enhanced_user_id_fkey (
            username,
            avatar_url,
            is_verified
          ),
          products (
            name
          )
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews((data as any) || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to write a review',
        variant: 'destructive',
      });
      return;
    }

    if (!reviewForm.title || !reviewForm.review_text) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('product_reviews_enhanced')
        .insert({
          user_id: user.id,
          service_id: serviceId,
          product_id: null,
          rating,
          title: reviewForm.title,
          review_text: reviewForm.review_text,
          verified_purchase: false,
        });

      if (error) throw error;

      toast({
        title: 'Review posted!',
        description: 'Thank you for sharing your experience',
      });

      setReviewForm({ title: '', review_text: '' });
      setRating(5);
      setShowWriteReview(false);
      loadReviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post review',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    return `${months} months ago`;
  };

  const renderStars = (count: number, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= (interactive ? (hoverRating || rating) : count)
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-gray-600'
            } ${interactive ? 'cursor-pointer transition-all' : ''}`}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && setRating(star)}
          />
        ))}
      </div>
    );
  };

  const getRatingDistribution = () => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[r.rating as keyof typeof dist]++;
      }
    });
    return dist;
  };

  const distribution = getRatingDistribution();
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-green-900/20 p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center md:items-start min-w-[200px]">
            <div className="text-6xl font-bold text-white mb-2">{averageRating.toFixed(1)}</div>
            {renderStars(Math.round(averageRating))}
            <p className="text-gray-400 mt-2">{totalReviews} reviews</p>
            <Button
              onClick={() => setShowWriteReview(!showWriteReview)}
              className="mt-4 bg-green-600 hover:bg-green-700 w-full"
            >
              Write a Review
            </Button>
          </div>

          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-12">{stars} star</span>
                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 transition-all"
                    style={{ width: `${(distribution[stars as keyof typeof distribution] / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 text-sm w-12 text-right">
                  {distribution[stars as keyof typeof distribution]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {showWriteReview && (
        <Card className="bg-gray-900 border-green-900/20 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Write Your Review</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Your Rating</Label>
              {renderStars(rating, true)}
            </div>

            <div>
              <Label htmlFor="review-title" className="text-gray-300">Review Title</Label>
              <Input
                id="review-title"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                placeholder="Sum up your experience"
                className="bg-black border-green-900/20 text-white"
              />
            </div>

            <div>
              <Label htmlFor="review-text" className="text-gray-300">Your Review</Label>
              <Textarea
                id="review-text"
                value={reviewForm.review_text}
                onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
                placeholder="Share your experience with this service..."
                rows={5}
                className="bg-black border-green-900/20 text-white"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Posting...' : 'Post Review'}
              </Button>
              <Button
                onClick={() => setShowWriteReview(false)}
                variant="outline"
                className="border-green-900/20"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-white">Customer Reviews</h3>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-48 animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <p className="text-gray-400">No reviews yet. Be the first to review!</p>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="bg-gray-900 border-green-900/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {review.user_profiles?.avatar_url ? (
                    <img
                      src={review.user_profiles.avatar_url}
                      alt={review.user_profiles.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-green-400 font-semibold text-lg">
                      {review.user_profiles?.username?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold">
                      {review.user_profiles?.username || 'Anonymous'}
                    </span>
                    {review.user_profiles?.is_verified && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {review.verified_purchase && (
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                        Verified Purchase
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    {renderStars(review.rating)}
                    <span className="text-gray-500 text-sm">{formatTimeAgo(review.created_at)}</span>
                  </div>

                  <h4 className="text-white font-semibold text-lg mb-2">{review.title}</h4>
                  {review.review_text && (
                    <p className="text-gray-300 mb-3 leading-relaxed">{review.review_text}</p>
                  )}

                  {review.products && (
                    <Badge variant="outline" className="border-green-500/20 text-green-400 mb-3">
                      {review.products.name}
                    </Badge>
                  )}

                  {review.effects && review.effects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {review.effects.map((effect, i) => (
                        <Badge key={i} variant="outline" className="border-gray-600 text-gray-400 text-xs">
                          {effect}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-green-500 p-0">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Helpful ({review.helpful_count})
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
