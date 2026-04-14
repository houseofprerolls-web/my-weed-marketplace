"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { viewerIsPlatformAdmin } from '@/lib/viewerPlatformAdmin';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { OptimizedImg } from '@/components/media/OptimizedImg';

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[];
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  expires_at: string | null;
  user_profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    feed_shadowbanned?: boolean;
  } | null;
};

type CommentRow = {
  id: string;
  comment: string;
  created_at: string;
  user_profiles: { id: string; username: string; avatar_url: string | null; is_verified: boolean } | null;
};

function renderLinkedText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+|\/listing\/[^\s]+|\/service\/[^\s]+|\/strains\/[^\s]+|\/brands\/[^\s]+)/g);
  return parts.map((part, idx) => {
    const isLink = /^(https?:\/\/|\/listing\/|\/service\/|\/strains\/|\/brands\/)/.test(part);
    if (!isLink) return <span key={idx}>{part}</span>;
    const internal = part.startsWith('/');
    if (internal) return <Link key={idx} href={part} className="text-green-400 hover:underline break-words">{part}</Link>;
    return <a key={idx} href={part} target="_blank" rel="noreferrer" className="text-green-400 hover:underline break-words">{part}</a>;
  });
}

export default function FeedPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const postId = useMemo(() => String(params?.id || '').trim(), [params]);
  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!postId) return;
    setLoading(true);
    try {
      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .select(
          `
          id,
          user_id,
          caption,
          media_urls,
          media_type,
          likes_count,
          comments_count,
          created_at,
          expires_at,
          user_profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url,
            is_verified,
            feed_shadowbanned
          )
        `
        )
        .eq('id', postId)
        .maybeSingle();
      if (postErr) throw postErr;
      if (!postData) {
        setPost(null);
        setComments([]);
        return;
      }
      if (postData.expires_at && new Date(postData.expires_at).getTime() <= Date.now()) {
        setPost(null);
        setComments([]);
        return;
      }
      const postAuthor = Array.isArray((postData as any).user_profiles)
        ? (postData as any).user_profiles[0]
        : (postData as any).user_profiles;
      if (postAuthor?.feed_shadowbanned === true) {
        const { data: sessionData } = await supabase.auth.getSession();
        const viewerId = sessionData.session?.user?.id ?? null;
        let viewerIsAdmin = false;
        if (viewerId) {
          viewerIsAdmin = await viewerIsPlatformAdmin(supabase, viewerId);
        }
        if (!viewerIsAdmin && viewerId !== postAuthor?.id) {
          setPost(null);
          setComments([]);
          return;
        }
      }
      setPost(postData as any);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/feed/posts/${postId}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setComments((j.comments as any[]) || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function deletePost() {
    if (!post || !user?.id || post.user_id !== user.id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Post deleted');
      router.push('/feed');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete');
    } finally {
      setDeleting(false);
    }
  }

  async function submitComment() {
    const trimmed = comment.trim();
    if (!trimmed) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error('Sign in required');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: trimmed }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setComment('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not comment');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white"
            onClick={() => router.push('/feed')}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <div className="ml-auto">
            <Link href="/feed/new">
              <Button className="bg-green-600 hover:bg-green-700">Create Post</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <Card className="bg-gray-900 border-green-900/20 h-96 animate-pulse" />
        ) : !post ? (
          <Card className="bg-gray-900 border-green-900/20 p-10 text-center">
            <div className="text-white font-semibold mb-2">This post is gone</div>
            <div className="text-gray-400 text-sm">Feed posts auto-delete after 48 hours.</div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-green-900/20 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-white font-semibold">{post.user_profiles?.username || 'Anonymous'}</div>
                  {user?.id && post.user_id === user.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                      disabled={deleting}
                      onClick={() => void deletePost()}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                  ) : null}
                </div>
                {post.caption ? <div className="text-white mt-2 whitespace-pre-wrap break-words">{renderLinkedText(post.caption)}</div> : null}
              </div>
              {post.media_urls?.length ? (
                <div className="aspect-square bg-gray-800">
                  {String(post.media_type || '').toLowerCase() === 'video' ? (
                    <video src={post.media_urls[0]} controls playsInline className="w-full h-full object-cover" />
                  ) : (
                    <OptimizedImg
                      src={post.media_urls[0]}
                      alt="Post"
                      className="h-full w-full object-cover"
                      preset="feed"
                    />
                  )}
                </div>
              ) : null}
            </Card>

            <Card className="bg-gray-900 border-green-900/20 p-4 space-y-3">
              <div className="text-white font-semibold">Comment</div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-black/40 border-green-900/30 text-white"
                placeholder="Write a friendly comment..."
                rows={3}
                maxLength={500}
              />
              <div className="flex justify-end">
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => void submitComment()} disabled={sending}>
                  {sending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              {comments.length ? (
                comments.map((c) => (
                  <Card key={c.id} className="bg-gray-900 border-green-900/20 p-4">
                    <div className="text-white font-semibold text-sm">{c.user_profiles?.username || 'Anonymous'}</div>
                    <div className="text-gray-200 mt-1 whitespace-pre-wrap break-words">{renderLinkedText(c.comment)}</div>
                  </Card>
                ))
              ) : (
                <Card className="bg-gray-900 border-green-900/20 p-6 text-center text-gray-400">No comments yet</Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

