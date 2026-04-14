"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { viewerIsPlatformAdmin } from "@/lib/viewerPlatformAdmin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, ImagePlus, Link2, MessageCircle, Search, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { OptimizedImg } from "@/components/media/OptimizedImg";
import { PlatformAdSlot } from "@/components/ads/PlatformAdSlot";
import { listingHrefForVendor } from "@/lib/listingPath";

type Post = {
  id: string;
  user_id: string;
  product_id?: string | null;
  caption: string | null;
  media_urls: string[];
  media_type?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  expires_at?: string | null;
  liked_by_me?: boolean;
  user_profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    feed_shadowbanned?: boolean;
  } | null;
  products: {
    id: string;
    name: string;
  } | null;
};

type SearchPayload = {
  vendors: Array<{ id: string; name: string; slug: string | null; city: string | null; state: string | null }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  strains: Array<{ id: string; name: string; slug: string; type: string | null }>;
  products: Array<{ id: string; name: string; brand_name: string | null; category: string }>;
};

function renderLinkedText(text: string) {
  const parts = text.split(
    /(https?:\/\/[^\s]+|\/listing\/[^\s]+|\/service\/[^\s]+|\/strains\/[^\s]+|\/brands\/[^\s]+|\/search\?[^\s]+)/g
  );
  return parts.map((part, idx) => {
    const isLink =
      /^(https?:\/\/|\/listing\/|\/service\/|\/strains\/|\/brands\/|\/search\?)/.test(part);
    if (!isLink) return <span key={idx}>{part}</span>;
    const internal = part.startsWith("/");
    if (internal) {
      const href = part.includes("?") ? part.split(/\s/)[0] : part;
      return (
        <Link key={idx} href={href} className="break-words text-emerald-300 underline-offset-2 hover:underline">
          {part}
        </Link>
      );
    }
    return (
      <a
        key={idx}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="break-words text-emerald-300 underline-offset-2 hover:underline"
      >
        {part}
      </a>
    );
  });
}

function postNotExpired(p: Post) {
  if (!p.expires_at) return true;
  return new Date(p.expires_at).getTime() > Date.now();
}

function isPostsSchemaError(message: string) {
  return (
    /posts/i.test(message) &&
    (/schema cache/i.test(message) || /not find/i.test(message) || /does not exist/i.test(message))
  );
}

function isFeedRelationshipError(message: string) {
  const m = message.toLowerCase();
  return (
    /relationship|embedded|suggestion/i.test(m) ||
    /column .* does not exist/i.test(m) ||
    /could not find .* foreign key/i.test(m)
  );
}

function normalizeOneToOne<T>(row: T | T[] | null): T | null {
  if (row == null) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

const FEED_PAGE_SIZE = 40;

function postMatchesFeedSearch(p: Post, q: string): boolean {
  if (!q) return true;
  const cap = (p.caption || "").toLowerCase();
  const uname = (p.user_profiles?.username || "").toLowerCase();
  return cap.includes(q) || uname.includes(q);
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [feedSchemaMissing, setFeedSchemaMissing] = useState(false);
  const [feedSearch, setFeedSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const prependAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const postsRef = useRef<Post[]>([]);
  postsRef.current = posts;

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchPayload, setSearchPayload] = useState<SearchPayload>({
    vendors: [],
    brands: [],
    strains: [],
    products: [],
  });

  /** Keeps scrollable chat clear of the fixed composer (height changes when link search is open or textarea grows). */
  const composerShellRef = useRef<HTMLDivElement>(null);
  const [scrollBottomPad, setScrollBottomPad] = useState(192);
  const [viewportNarrow, setViewportNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setViewportNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const guestMobileComposerHidden = !user && viewportNarrow;

  useEffect(() => {
    if (guestMobileComposerHidden) {
      setScrollBottomPad(12);
      return;
    }
    const el = composerShellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      setScrollBottomPad(Math.max(120, h + 24));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [guestMobileComposerHidden, user, linkOpen]);

  useEffect(() => {
    const q = linkQuery.trim();
    if (q.length < 2) {
      setSearchPayload({ vendors: [], brands: [], strains: [], products: [] });
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`, { cache: "no-store" });
          const j = (await res.json()) as Partial<SearchPayload>;
          if (!res.ok) throw new Error("Search failed");
          setSearchPayload({
            vendors: Array.isArray(j.vendors) ? j.vendors : [],
            brands: Array.isArray(j.brands) ? j.brands : [],
            strains: Array.isArray(j.strains) ? j.strains : [],
            products: Array.isArray(j.products) ? j.products : [],
          });
        } catch {
          setSearchPayload({ vendors: [], brands: [], strains: [], products: [] });
        } finally {
          setSearching(false);
        }
      })();
    }, 180);
    return () => window.clearTimeout(t);
  }, [linkQuery]);

  function pickLink(url: string, label: string) {
    setLinkUrl(url);
    setLinkLabel(label);
    setLinkQuery(label);
    setLinkOpen(false);
    toast.success("Link added — send when ready");
  }

  const captionToSend = useMemo(() => {
    const text = draft.trim();
    const normalizedLink = linkUrl.trim();
    if (normalizedLink && !text.includes(normalizedLink)) {
      return `${text} ${normalizedLink}`.trim();
    }
    return text;
  }, [draft, linkUrl]);

  const feedSearchNorm = feedSearch.trim().toLowerCase();

  const displayPosts = useMemo(() => {
    if (!feedSearchNorm) return posts;
    return posts.filter((p) => postMatchesFeedSearch(p, feedSearchNorm));
  }, [posts, feedSearchNorm]);

  const fetchPostsPage = useCallback(
    async (opts: { beforeCreatedAt?: string }): Promise<{ rows: Post[]; error: { message?: string } | null }> => {
      const selectWithProfile = `
          id,
          user_id,
          product_id,
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
        `;

      let q = supabase.from("posts").select(selectWithProfile).order("created_at", { ascending: false }).limit(FEED_PAGE_SIZE);
      if (opts.beforeCreatedAt) {
        q = q.lt("created_at", opts.beforeCreatedAt);
      }

      let { data, error } = await q;
      if (error?.message && isFeedRelationshipError(error.message)) {
        let retry = supabase
          .from("posts")
          .select(
            `
          id,
          user_id,
          product_id,
          caption,
          media_urls,
          media_type,
          likes_count,
          comments_count,
          created_at,
          expires_at,
          user_profiles (
            id,
            username,
            avatar_url,
            is_verified,
            feed_shadowbanned
          )
        `
          )
          .order("created_at", { ascending: false })
          .limit(FEED_PAGE_SIZE);
        if (opts.beforeCreatedAt) {
          retry = retry.lt("created_at", opts.beforeCreatedAt);
        }
        const r2 = await retry;
        if (!r2.error) {
          data = r2.data;
          error = null;
        } else {
          error = r2.error;
        }
      }

      if (error || !data) {
        return { rows: [], error: error as { message?: string } | null };
      }

      const rows = data as any[];
      const seenProductIds: Record<string, true> = {};
      const productIds: string[] = [];
      for (const r of rows) {
        const id = r.product_id != null ? String(r.product_id) : "";
        if (id.length > 0 && !seenProductIds[id]) {
          seenProductIds[id] = true;
          productIds.push(id);
        }
      }
      const productById = new Map<string, { id: string; name: string }>();
      if (productIds.length > 0) {
        const { data: prows, error: perr } = await supabase.from("products").select("id, name").in("id", productIds);
        if (!perr && Array.isArray(prows)) {
          for (const row of prows as { id: string; name: string }[]) {
            productById.set(String(row.id), { id: String(row.id), name: row.name });
          }
        }
      }

      const raw: Post[] = rows.map((r) => {
        const pid = r.product_id != null ? String(r.product_id) : "";
        const linked = pid ? productById.get(pid) ?? null : null;
        return {
          ...r,
          user_profiles: normalizeOneToOne(r.user_profiles),
          products: linked,
        } as Post;
      });
      const active = raw.filter(postNotExpired);

      let viewerIsAdmin = false;
      if (user) {
        viewerIsAdmin = await viewerIsPlatformAdmin(supabase, user.id);
      }

      if (user && active.length) {
        const ids = active.map((p) => p.id);
        const { data: likes, error: likesErr } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", ids);
        if (!likesErr) {
          const likedSet = new Set((likes || []).map((r: any) => String(r.post_id)));
          for (const p of active) p.liked_by_me = likedSet.has(p.id);
        }
      }

      const visibleRows = active.filter((p) => {
        const hidden = p.user_profiles?.feed_shadowbanned === true;
        if (!hidden) return true;
        if (viewerIsAdmin) return true;
        return user?.id != null && p.user_profiles?.id === user.id;
      });

      const chrono = [...visibleRows].reverse();
      return { rows: chrono, error: null };
    },
    [user]
  );

  /** Re-fetch the latest window and merge into state (new messages, updated counts). */
  const mergeLatestWindow = useCallback(async () => {
    const { rows, error } = await fetchPostsPage({});
    if (error?.message || rows.length === 0) return;
    setPosts((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const p of rows) map.set(p.id, p);
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, [fetchPostsPage]);

  const loadInitialFeed = useCallback(async () => {
    try {
      setFeedSchemaMissing(false);
      const { rows, error } = await fetchPostsPage({});
      if (error) {
        console.error("Error loading feed:", error);
        const msg = error.message || "";
        if (isPostsSchemaError(msg)) {
          setFeedSchemaMissing(true);
          setPosts([]);
          toast.error(
            "Feed tables are missing on your Supabase project. Apply migration 0105_community_feed_posts.sql from the repo (or run full migrations), then reload."
          );
          return;
        }
        if (isFeedRelationshipError(msg)) {
          toast.error(`Could not load chat: ${msg}`);
        } else {
          toast.error("Could not load chat");
        }
        return;
      }
      setPosts(rows);
      setHasMoreOlder(rows.length >= FEED_PAGE_SIZE);
      initialScrollDoneRef.current = false;
    } catch (error: any) {
      console.error("Error loading feed:", error);
      const msg = String(error?.message || "");
      if (isPostsSchemaError(msg)) {
        setFeedSchemaMissing(true);
        toast.error(
          "Feed tables are missing on your Supabase project. Apply migration 0105_community_feed_posts.sql, then reload."
        );
        setPosts([]);
      } else if (isFeedRelationshipError(msg)) {
        toast.error(`Could not load chat: ${msg}`);
      } else {
        toast.error("Could not load chat");
      }
    } finally {
      setLoading(false);
    }
  }, [fetchPostsPage]);

  useEffect(() => {
    void loadInitialFeed();
  }, [loadInitialFeed]);

  const loadOlderPosts = useCallback(async () => {
    if (loadingOlder || !hasMoreOlder || posts.length === 0) return;
    const oldest = posts[0];
    if (!oldest?.created_at) return;
    const el = scrollAreaRef.current;
    if (el) {
      prependAnchorRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
    }
    setLoadingOlder(true);
    try {
      const { rows, error } = await fetchPostsPage({ beforeCreatedAt: oldest.created_at });
      if (error?.message) {
        toast.error("Could not load older messages");
        return;
      }
      if (rows.length < FEED_PAGE_SIZE) setHasMoreOlder(false);
      const have = new Set(postsRef.current.map((p) => p.id));
      const olderFirst = rows.filter((p) => !have.has(p.id));
      if (olderFirst.length === 0 && rows.length > 0) {
        setHasMoreOlder(false);
        return;
      }
      setPosts((prev) => [...olderFirst, ...prev]);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMoreOlder, posts, fetchPostsPage]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    const anchor = prependAnchorRef.current;
    if (el && anchor) {
      const delta = el.scrollHeight - anchor.scrollHeight;
      el.scrollTop = anchor.scrollTop + delta;
      prependAnchorRef.current = null;
    }
  }, [posts]);

  useEffect(() => {
    const root = scrollAreaRef.current;
    const target = topSentinelRef.current;
    if (!root || !target || !hasMoreOlder || loading || feedSchemaMissing) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) void loadOlderPosts();
      },
      { root, rootMargin: "120px 0px 0px 0px", threshold: 0 }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [hasMoreOlder, loading, loadOlderPosts, feedSchemaMissing, posts.length]);

  useEffect(() => {
    if (loading || posts.length === 0) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    if (!initialScrollDoneRef.current) {
      el.scrollTop = el.scrollHeight;
      initialScrollDoneRef.current = true;
    }
  }, [loading, posts.length]);

  useEffect(() => {
    if (!feedSearchNorm || displayPosts.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedSearchNorm, displayPosts.length]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  async function getAuthToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function toggleLike(post: Post) {
    const token = await getAuthToken();
    if (!token) {
      toast.error("Sign in to react");
      return;
    }
    setLikingId(post.id);
    const liked = Boolean(post.liked_by_me);
    const prevLiked = liked;
    const prevCount = post.likes_count;
    setPosts((list) =>
      list.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: !liked,
              likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)),
            }
          : p
      )
    );
    try {
      const res = await fetch(`/api/feed/posts/${post.id}/like`, {
        method: liked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
    } catch (e: any) {
      setPosts((list) =>
        list.map((p) =>
          p.id === post.id ? { ...p, liked_by_me: prevLiked, likes_count: prevCount } : p
        )
      );
      toast.error(e?.message || "Could not update reaction");
    } finally {
      setLikingId(null);
    }
  }

  async function sendChatMessage() {
    const text = captionToSend;
    if (!text) return;
    if (!user) {
      toast.error("Sign in to send a message");
      return;
    }
    setSending(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/feed/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption: text,
          media_urls: [],
          media_type: "image",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setDraft("");
      setLinkUrl("");
      setLinkLabel("");
      setLinkQuery("");
      toast.success("Sent");
      await mergeLatestWindow();
    } catch (e: any) {
      const msg = e?.message || "Could not send";
      toast.error(msg);
      if (isPostsSchemaError(msg)) {
        setFeedSchemaMissing(true);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pt-4" style={{ paddingBottom: scrollBottomPad }}>
      <div className="container mx-auto flex min-h-0 max-w-lg flex-1 flex-col px-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-white">Community chat</h1>
            <p className="text-xs text-zinc-500">
              Link a dispensary, brand, strain, or SKU from the toolbar — opens as a tap-friendly link.
            </p>
          </div>
          <Link href="/feed/new">
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <ImagePlus className="mr-1.5 h-4 w-4" />
              Media
            </Button>
          </Link>
        </div>

        {!user ? (
          <div className="mb-3 block rounded-xl border border-brand-red/35 bg-brand-red/10 px-3 py-3 md:hidden">
            <p className="text-sm font-medium text-white">Sign in to post, react, and add links</p>
            <p className="mt-1 text-xs text-zinc-400">Use your account to join the community chat on mobile.</p>
            <Button
              type="button"
              className="mt-3 w-full bg-brand-red text-white hover:bg-brand-red-deep sm:w-auto"
              onClick={() => window.dispatchEvent(new Event("datreehouse:open-auth"))}
            >
              Sign in
            </Button>
          </div>
        ) : null}

        <div className="mb-3">
          <PlatformAdSlot placementKey="feed" stripLabel="Community sponsors" />
        </div>

        <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
          <div className="shrink-0 space-y-2 border-b border-zinc-800/80 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                placeholder="Search messages or @usernames…"
                className="border-zinc-700 bg-zinc-900/80 pl-9 text-sm text-white placeholder:text-zinc-600"
                aria-label="Search feed"
              />
            </div>
            {feedSearchNorm ? (
              <p className="text-[11px] text-zinc-500">
                {displayPosts.length} match{displayPosts.length === 1 ? "" : "es"} in loaded history
                {displayPosts.length < posts.length ? ` · ${posts.length} messages loaded — scroll up for older` : null}
              </p>
            ) : (
              <p className="text-[11px] text-zinc-500">
                Scroll up to load older messages. Search filters what you&apos;ve already loaded.
              </p>
            )}
          </div>

          <div
            ref={scrollAreaRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
          >
            {loading ? (
              <div className="flex flex-1 flex-col justify-end gap-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-2xl bg-zinc-800/60" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                {feedSchemaMissing ? (
                  <>
                    <p className="text-amber-200/90">Community feed isn&apos;t wired to this database yet.</p>
                    <p className="max-w-sm text-xs text-zinc-500">
                      Apply{" "}
                      <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">0105_community_feed_posts.sql</code>{" "}
                      in the Supabase SQL editor or run <code className="rounded bg-zinc-800 px-1 py-0.5">supabase db push</code>
                      . Then refresh this page.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-zinc-400">No messages yet — say hi.</p>
                    {user ? null : <p className="text-xs text-zinc-600">Sign in to join the chat.</p>}
                  </>
                )}
              </div>
            ) : displayPosts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <p className="text-zinc-400">No messages match &quot;{feedSearch.trim()}&quot;</p>
                <p className="mt-1 text-xs text-zinc-600">Try other keywords or scroll up to load more history.</p>
              </div>
            ) : (
              <>
                <div ref={topSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
                {loadingOlder ? (
                  <div className="py-2 text-center text-[11px] text-zinc-500">Loading older messages…</div>
                ) : hasMoreOlder ? (
                  <div className="py-1 text-center text-[10px] text-zinc-600">↑ Scroll up for older</div>
                ) : posts.length > 0 ? (
                  <div className="py-1 text-center text-[10px] text-zinc-600">Beginning of loaded history</div>
                ) : null}
                {displayPosts.map((post) => {
              const isMine = Boolean(user?.id && post.user_id === user.id);
              const uname = post.user_profiles?.username || "Member";
              return (
                <div key={post.id} className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[90%] gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    {!isMine ? (
                      <div className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                        {post.user_profiles?.avatar_url ? (
                          <img src={post.user_profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-emerald-400">
                            {uname.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ) : null}
                    <div className="flex min-w-0 flex-col gap-1">
                      {!isMine ? (
                        <span className="px-1 text-[11px] font-medium text-zinc-500">
                          <Link
                            href={`/profile/${encodeURIComponent(uname)}`}
                            className="hover:text-emerald-400 hover:underline"
                          >
                            @{uname}
                          </Link>
                          {post.user_profiles?.is_verified ? <span className="ml-1 text-emerald-500">✓</span> : null}
                        </span>
                      ) : null}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 ${
                          isMine ? "rounded-br-md bg-emerald-700/85 text-white" : "rounded-bl-md bg-zinc-800/90 text-zinc-100"
                        }`}
                      >
                        {post.caption ? (
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {renderLinkedText(post.caption)}
                          </div>
                        ) : null}
                        {post.media_urls && post.media_urls.length > 0 ? (
                          <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                            {String(post.media_type || "").toLowerCase() === "video" ? (
                              <video src={post.media_urls[0]} controls playsInline className="max-h-56 w-full object-cover" />
                            ) : (
                              <OptimizedImg
                                src={post.media_urls[0]}
                                alt=""
                                className="max-h-56 w-full object-cover"
                                preset="feed"
                              />
                            )}
                          </div>
                        ) : null}
                        {post.products ? (
                          <Link
                            href={`/search?q=${encodeURIComponent(post.products.name)}`}
                            className="mt-2 inline-block text-xs font-medium text-emerald-200 underline-offset-2 hover:underline"
                          >
                            {post.products.name}
                          </Link>
                        ) : null}
                      </div>
                      <div
                        className={`flex items-center gap-3 px-1 text-[11px] text-zinc-500 ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <span>{formatTime(post.created_at)}</span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-rose-400 disabled:opacity-50"
                          onClick={() => void toggleLike(post)}
                          disabled={likingId === post.id}
                        >
                          <Heart className={`h-3.5 w-3.5 ${post.liked_by_me ? "fill-rose-400 text-rose-400" : ""}`} />
                          {post.likes_count > 0 ? post.likes_count : null}
                        </button>
                        <Link href={`/feed/${post.id}`} className="inline-flex items-center gap-1 text-zinc-400 hover:text-emerald-400">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.comments_count > 0 ? post.comments_count : "Reply"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </div>
      </div>

      <div
        ref={composerShellRef}
        className={`fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-md ${
          guestMobileComposerHidden ? "hidden md:block" : ""
        }`}
      >
        <div className="container mx-auto max-w-lg px-3">
          {linkOpen ? (
            <div className="mb-2 space-y-2 rounded-xl border border-zinc-700 bg-black/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">Link store, brand, strain, or SKU</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-zinc-400" onClick={() => setLinkOpen(false)}>
                  Close
                </Button>
              </div>
              <Input
                value={linkQuery}
                onChange={(e) => setLinkQuery(e.target.value)}
                placeholder="Type at least 2 characters…"
                className="border-zinc-600 bg-zinc-900 text-sm text-white"
              />
              {linkUrl ? (
                <p className="text-xs text-emerald-400">
                  Selected: {linkLabel || linkUrl}{" "}
                  <button
                    type="button"
                    className="ml-2 underline text-zinc-400 hover:text-white"
                    onClick={() => {
                      setLinkUrl("");
                      setLinkLabel("");
                      setLinkQuery("");
                    }}
                  >
                    Clear
                  </button>
                </p>
              ) : null}
              <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {searching ? <div className="px-2 py-1 text-zinc-500">Searching…</div> : null}
                {!searching &&
                searchPayload.vendors.length +
                  searchPayload.brands.length +
                  searchPayload.strains.length +
                  searchPayload.products.length ===
                  0 ? (
                  <div className="px-2 py-1 text-zinc-600">Type to search the directory.</div>
                ) : null}
                {searchPayload.vendors.map((v) => (
                  <button
                    key={`v-${v.id}`}
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-left text-white hover:bg-zinc-800"
                    onClick={() => pickLink(listingHrefForVendor({ id: v.id, slug: v.slug }), v.name)}
                  >
                    Store: {v.name}
                  </button>
                ))}
                {searchPayload.products.map((p) => (
                  <button
                    key={`p-${p.id}`}
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-left text-white hover:bg-zinc-800"
                    onClick={() => pickLink(`/search?q=${encodeURIComponent(p.name)}`, p.name)}
                  >
                    SKU: {p.name}
                    {p.brand_name ? <span className="text-zinc-500"> · {p.brand_name}</span> : null}
                  </button>
                ))}
                {searchPayload.strains.map((s) => (
                  <button
                    key={`s-${s.id}`}
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-left text-white hover:bg-zinc-800"
                    onClick={() => pickLink(`/strains/${s.slug}`, s.name)}
                  >
                    Strain: {s.name}
                  </button>
                ))}
                {searchPayload.brands.map((b) => (
                  <button
                    key={`b-${b.id}`}
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-left text-white hover:bg-zinc-800"
                    onClick={() => pickLink(`/brands/${b.slug}`, b.name)}
                  >
                    Brand: {b.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-end gap-2 pb-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={user ? "Message the community…" : "Sign in to chat"}
                disabled={!user || sending}
                className="min-h-[44px] resize-none border-zinc-700 bg-black/50 text-sm text-white placeholder:text-zinc-600"
                rows={2}
                maxLength={1000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChatMessage();
                  }
                }}
              />
              {linkUrl ? (
                <p className="text-[11px] text-zinc-500">
                  Will include: <span className="text-emerald-400">{linkLabel || linkUrl}</span>
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 border-cyan-600/40 text-cyan-400 hover:bg-cyan-950/50"
              disabled={!user || sending}
              onClick={() => setLinkOpen((o) => !o)}
              aria-label="Add link to store, brand, strain, or SKU"
            >
              <Link2 className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 bg-emerald-600 hover:bg-emerald-700"
              disabled={!user || sending || !captionToSend}
              onClick={() => void sendChatMessage()}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
