"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, MoveHorizontal as MoreHorizontal, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type Post = {
  id: string;
  caption: string | null;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
  products: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          media_urls,
          likes_count,
          comments_count,
          created_at,
          user_profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url,
            is_verified
          ),
          products (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts((data as any) || []);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">Community Feed</h1>
            <Link href="/feed/trending">
              <Button variant="outline" className="border-green-500/20 text-green-400 hover:bg-green-500/10">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-96 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">No posts yet</p>
            <p className="text-gray-500 mb-6">Be the first to share your cannabis experience</p>
            <Button className="bg-green-600 hover:bg-green-700">
              Create Post
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="bg-gray-900 border-green-900/20 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center overflow-hidden">
                        {post.user_profiles?.avatar_url ? (
                          <img src={post.user_profiles.avatar_url} alt={post.user_profiles.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-green-400 font-semibold">
                            {post.user_profiles?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{post.user_profiles?.username || 'Anonymous'}</span>
                          {post.user_profiles?.is_verified && (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs">{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-gray-400">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>

                  {post.caption && (
                    <p className="text-white mb-4">{post.caption}</p>
                  )}

                  {post.products && (
                    <Link href={`/service/${post.products.slug}`}>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full mb-4 hover:bg-green-500/20 transition">
                        <span className="text-green-400 text-sm font-medium">{post.products.name}</span>
                      </div>
                    </Link>
                  )}
                </div>

                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="aspect-square bg-gray-800 relative">
                    <img
                      src={post.media_urls[0]}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center gap-6 mb-3">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500 p-0">
                      <Heart className="h-6 w-6 mr-2" />
                      <span className="font-semibold">{post.likes_count}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-green-500 p-0">
                      <MessageCircle className="h-6 w-6 mr-2" />
                      <span className="font-semibold">{post.comments_count}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-green-500 p-0">
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
