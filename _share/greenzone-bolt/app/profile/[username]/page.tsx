"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Calendar, Award, Heart, Image as ImageIcon } from 'lucide-react';

type UserProfile = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_verified: boolean;
  created_at: string;
};

type Post = {
  id: string;
  caption: string | null;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
};

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [params.username]);

  const loadProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', params.username)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, caption, media_urls, likes_count, comments_count, created_at')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (postsError) throw postsError;
      setPosts(postsData || []);

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
        setIsFollowing(false);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profile.id,
          });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="bg-gray-900 border-green-900/20 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-400">This user doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="relative h-64 bg-gradient-to-br from-green-900 to-black">
        {profile.cover_photo_url && (
          <img
            src={profile.cover_photo_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        <div className="relative -mt-20 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="w-32 h-32 rounded-full border-4 border-black bg-gray-900 overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-green-500/20">
                  <span className="text-4xl font-bold text-green-400">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
                {profile.is_verified && (
                  <Award className="h-6 w-6 text-green-500" />
                )}
              </div>
              {profile.bio && <p className="text-gray-300 mb-4">{profile.bio}</p>}

              <div className="flex items-center gap-6 text-sm text-gray-400 mb-4">
                <div>
                  <span className="text-white font-semibold">{profile.posts_count}</span> posts
                </div>
                <div>
                  <span className="text-white font-semibold">{profile.followers_count}</span> followers
                </div>
                <div>
                  <span className="text-white font-semibold">{profile.following_count}</span> following
                </div>
              </div>

              {user && user.id !== profile.id && (
                <Button
                  onClick={handleFollow}
                  className={isFollowing ? 'bg-gray-700 hover:bg-gray-800' : 'bg-green-600 hover:bg-green-700'}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="bg-gray-900 border border-green-900/20 w-full">
            <TabsTrigger value="posts" className="data-[state=active]:bg-green-600 flex-1">
              <ImageIcon className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="liked" className="data-[state=active]:bg-green-600 flex-1">
              <Heart className="h-4 w-4 mr-2" />
              Liked
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {posts.length === 0 ? (
              <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
                <p className="text-gray-400">No posts yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square bg-gray-800 relative group cursor-pointer overflow-hidden"
                  >
                    {post.media_urls && post.media_urls.length > 0 ? (
                      <img
                        src={post.media_urls[0]}
                        alt="Post"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                      <div className="flex items-center gap-1">
                        <Heart className="h-5 w-5 fill-current" />
                        <span className="font-semibold">{post.likes_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
              <p className="text-gray-400">Liked posts are private</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
