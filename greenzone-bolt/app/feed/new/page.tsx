"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { listingHrefForVendor } from '@/lib/listingPath';

type SignedUpload = {
  bucket: string;
  object_path: string;
  public_url: string;
  signed_url: string;
  token: string;
};

type SearchPayload = {
  vendors: Array<{ id: string; name: string; slug: string | null; city: string | null; state: string | null }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  strains: Array<{ id: string; name: string; slug: string; type: string | null }>;
  products: Array<{ id: string; name: string; brand_name: string | null; category: string }>;
};

export default function NewFeedPostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchPayload, setSearchPayload] = useState<SearchPayload>({
    vendors: [],
    brands: [],
    strains: [],
    products: [],
  });

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const isVideo = file?.type?.startsWith('video/') ?? false;

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
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`, { cache: 'no-store' });
          const j = (await res.json()) as Partial<SearchPayload>;
          if (!res.ok) throw new Error('Search failed');
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
    setSearchOpen(false);
  }

  async function getAuthToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function getVideoDurationSeconds(f: File) {
    return await new Promise<number>((resolve, reject) => {
      const url = URL.createObjectURL(f);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        const d = Number(v.duration);
        URL.revokeObjectURL(url);
        if (!Number.isFinite(d)) reject(new Error('Could not read video duration'));
        else resolve(d);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read video metadata'));
      };
      v.src = url;
    });
  }

  async function signAndUpload() {
    const token = await getAuthToken();
    if (!token) throw new Error('Sign in required');
    if (!file) throw new Error('Pick a photo or video');

    const duration_s = isVideo ? await getVideoDurationSeconds(file) : undefined;

    const res = await fetch('/api/uploads/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        kind: 'feed',
        mime_type: file.type,
        bytes: file.size,
        duration_s,
      }),
    });
    const j = (await res.json()) as any;
    if (!res.ok) throw new Error(j.error || res.statusText);

    const signed = j as SignedUpload;
    const up = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.object_path, signed.token, file, {
      contentType: file.type,
      upsert: false,
    });
    if (up.error) throw new Error(up.error.message);

    return { token, publicUrl: signed.public_url, mediaType: isVideo ? 'video' : 'image' };
  }

  async function createPost() {
    if (!user) {
      toast.error('Sign in required');
      return;
    }
    setBusy(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Sign in required');

      let media_urls: string[] = [];
      let media_type: 'image' | 'video' = 'image';

      if (file) {
        const up = await signAndUpload();
        media_urls = [up.publicUrl];
        media_type = up.mediaType as any;
      }

      const normalizedLink = linkUrl.trim();
      const captionWithLink =
        normalizedLink && !caption.includes(normalizedLink)
          ? `${caption.trim()} ${normalizedLink}`.trim()
          : caption.trim();

      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption: captionWithLink || null,
          media_urls,
          media_type,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);

      toast.success('Sent to chat');
      router.push('/feed');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to post');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Share a photo or clip</h1>
          <p className="text-gray-400 text-sm">Optional media for the community chat — keep it friendly.</p>
        </div>

        <Card className="bg-gray-900 border-green-900/20 p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Message</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What do you want to say?"
              className="bg-black/40 border-green-900/30 text-white"
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Media (optional)</label>
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-black/40 border-green-900/30 text-white"
            />
            {file ? (
              <div className="rounded-lg overflow-hidden border border-green-900/20 bg-black/30">
                {isVideo ? (
                  <video src={previewUrl || undefined} controls playsInline className="w-full max-h-[520px] object-contain" />
                ) : (
                  <img src={previewUrl || undefined} alt="Preview" className="w-full max-h-[520px] object-contain" />
                )}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Link store, SKU, strain, or brand (optional)</label>
            <Input
              value={linkQuery}
              onChange={(e) => {
                setLinkQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search and select a store, SKU, strain, or brand"
              className="bg-black/40 border-green-900/30 text-white"
            />
            {linkUrl ? (
              <div className="text-xs text-green-300">
                Linked: {linkLabel || linkUrl}{' '}
                <button
                  type="button"
                  className="ml-2 underline text-gray-300 hover:text-white"
                  onClick={() => {
                    setLinkUrl('');
                    setLinkLabel('');
                    setLinkQuery('');
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}
            {searchOpen ? (
              <div className="rounded-lg border border-green-900/30 bg-black/80 p-2 text-sm max-h-60 overflow-y-auto space-y-1">
                {searching ? <div className="text-gray-400 px-2 py-1">Searching…</div> : null}
                {!searching &&
                searchPayload.vendors.length +
                  searchPayload.brands.length +
                  searchPayload.strains.length +
                  searchPayload.products.length ===
                  0 ? (
                  <div className="text-gray-500 px-2 py-1">Type at least 2 characters to search.</div>
                ) : null}
                {searchPayload.vendors.map((v) => (
                  <button
                    key={`store-${v.id}`}
                    type="button"
                    className="w-full text-left px-2 py-1 rounded hover:bg-green-900/30 text-white"
                    onClick={() => pickLink(listingHrefForVendor({ id: v.id, slug: v.slug }), `Store: ${v.name}`)}
                  >
                    Store: {v.name}
                  </button>
                ))}
                {searchPayload.products.map((p) => (
                  <button
                    key={`product-${p.id}`}
                    type="button"
                    className="w-full text-left px-2 py-1 rounded hover:bg-green-900/30 text-white"
                    onClick={() => pickLink(`/search?q=${encodeURIComponent(p.name)}`, `SKU: ${p.name}`)}
                  >
                    SKU: {p.name}
                    {p.brand_name ? <span className="text-gray-400"> · {p.brand_name}</span> : null}
                  </button>
                ))}
                {searchPayload.strains.map((s) => (
                  <button
                    key={`strain-${s.id}`}
                    type="button"
                    className="w-full text-left px-2 py-1 rounded hover:bg-green-900/30 text-white"
                    onClick={() => pickLink(`/strains/${s.slug}`, `Strain: ${s.name}`)}
                  >
                    Strain: {s.name}
                  </button>
                ))}
                {searchPayload.brands.map((b) => (
                  <button
                    key={`brand-${b.id}`}
                    type="button"
                    className="w-full text-left px-2 py-1 rounded hover:bg-green-900/30 text-white"
                    onClick={() => pickLink(`/brands/${b.slug}`, `Brand: ${b.name}`)}
                  >
                    Brand: {b.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              className="border-green-500/20 text-green-400 hover:bg-green-500/10"
              onClick={() => router.push('/feed')}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => void createPost()} disabled={busy}>
              {busy ? 'Sending...' : 'Send to chat'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

