"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Room = { id: string; slug: string; name: string; description: string | null };

type MessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  profiles?: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
  attachments?: AttachmentRow[];
};

type AttachmentRow = {
  id: string;
  public_url: string;
  mime_type: string | null;
  bytes: number | null;
};

type SignedUpload = {
  bucket: string;
  object_path: string;
  public_url: string;
  token: string;
};

function isProbablyInternalLink(s: string) {
  return s.startsWith('/listing/') || s.startsWith('/service/') || s.startsWith('/strains/') || s.startsWith('/brands/');
}

function tokenizeContent(content: string) {
  const tokens: Array<{ type: 'text' | 'link'; value: string }> = [];
  const re = /(https?:\/\/[^\s]+|\/listing\/[^\s]+|\/service\/[^\s]+|\/strains\/[^\s]+|\/brands\/[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: content.slice(last, m.index) });
    tokens.push({ type: 'link', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < content.length) tokens.push({ type: 'text', value: content.slice(last) });
  return tokens;
}

export function ChatRoom({ room }: { room: Room }) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const roomId = room.id;

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('community_messages')
          .select(
            `
            id,
            room_id,
            user_id,
            content,
            created_at,
            profiles (
              id,
              username,
              full_name,
              avatar_url
            )
          `
          )
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);
        if (error) throw error;
        if (cancelled) return;
        setMessages((data as any) || []);
        setTimeout(scrollToBottom, 50);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load chat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`community_room_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) => [...prev, row]);
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function getAuthToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function signUpload(f: File) {
    const token = await getAuthToken();
    if (!token) throw new Error('Sign in required');

    const res = await fetch('/api/uploads/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        kind: 'chat',
        mime_type: f.type,
        bytes: f.size,
        duration_s: f.type.startsWith('video/') ? 1 : undefined,
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j as SignedUpload;
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed && !file) return;
    setSending(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Sign in required');

      let attachment: any = null;
      if (file) {
        const signed = await signUpload(file);
        const up = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.object_path, signed.token, file, {
          contentType: file.type,
          upsert: false,
        });
        if (up.error) throw up.error;
        attachment = {
          bucket: signed.bucket,
          object_path: signed.object_path,
          public_url: signed.public_url,
          mime_type: file.type,
          bytes: file.size,
        };
      }

      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: roomId,
          content: trimmed || null,
          attachment,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);

      setInput('');
      setFile(null);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  const rendered = useMemo(() => {
    return messages.map((m) => {
      const content = String(m.content || '');
      const tokens = content ? tokenizeContent(content) : [];
      return { ...m, _tokens: tokens };
    });
  }, [messages]);

  return (
    <div className="space-y-3">
      <Card className="bg-gray-900 border-green-900/20 p-4">
        <div className="text-white font-semibold">{room.name}</div>
        {room.description ? <div className="text-gray-400 text-sm mt-1">{room.description}</div> : null}
      </Card>

      <Card className="bg-gray-900 border-green-900/20 p-0 overflow-hidden">
        <div ref={listRef} className="h-[60vh] overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-gray-400">Loading chat…</div>
          ) : rendered.length ? (
            rendered.map((m: any) => (
              <div key={m.id} className="space-y-1">
                <div className="text-xs text-gray-500">
                  {m.profiles?.username || m.profiles?.full_name || 'Anonymous'}
                </div>
                {m._tokens.length ? (
                  <div className="text-gray-200 whitespace-pre-wrap break-words">
                    {m._tokens.map((t: any, idx: number) =>
                      t.type === 'link' ? (
                        isProbablyInternalLink(t.value) ? (
                          <Link key={idx} href={t.value} className="text-green-400 hover:underline">
                            {t.value}
                          </Link>
                        ) : (
                          <a
                            key={idx}
                            href={t.value}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-400 hover:underline"
                          >
                            {t.value}
                          </a>
                        )
                      ) : (
                        <span key={idx}>{t.value}</span>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-gray-400">No messages yet. Say hi.</div>
          )}
        </div>

        <div className="border-t border-green-900/20 p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a message…"
              className="bg-black/40 border-green-900/30 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={sending}
            />
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => void send()} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-black/40 border-green-900/30 text-white"
              disabled={sending}
            />
            {file ? <div className="text-xs text-gray-400 truncate max-w-[240px]">{file.name}</div> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

