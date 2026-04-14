"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatRoom } from '@/components/community/ChatRoom';
import { toast } from 'sonner';

type Room = { id: string; slug: string; name: string; description: string | null };

export default function CommunityChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('general');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('community_rooms')
          .select('id, slug, name, description')
          .order('name', { ascending: true });
        if (error) throw error;
        const rows: Room[] = (data as any) || [];
        setRooms(rows);
        if (rows.length && !rows.some((r) => r.slug === activeSlug)) {
          setActiveSlug(rows[0].slug);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRoom = useMemo(() => rooms.find((r) => r.slug === activeSlug) || null, [rooms, activeSlug]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Treehouse Chat</h1>
            <p className="text-gray-400 text-sm">Friendly community rooms. No selling. No spam.</p>
          </div>
          <Link href="/feed">
            <Button variant="outline" className="border-green-500/20 text-green-400 hover:bg-green-500/10">
              Back to Feed
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900 border-green-900/20 p-3 md:col-span-1">
            <div className="text-white font-semibold mb-2">Rooms</div>
            {loading ? (
              <div className="text-gray-400 text-sm">Loading…</div>
            ) : rooms.length ? (
              <div className="space-y-2">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveSlug(r.slug)}
                    className={`w-full text-left px-3 py-2 rounded border ${
                      r.slug === activeSlug
                        ? 'border-green-500/30 bg-green-500/10 text-white'
                        : 'border-green-900/20 bg-black/30 text-gray-300 hover:bg-black/40'
                    }`}
                  >
                    <div className="font-medium">{r.name}</div>
                    {r.description ? <div className="text-xs text-gray-500 mt-0.5">{r.description}</div> : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No rooms found.</div>
            )}
          </Card>

          <div className="md:col-span-2">
            {activeRoom ? (
              <ChatRoom room={activeRoom} />
            ) : (
              <Card className="bg-gray-900 border-green-900/20 p-8 text-center text-gray-400">
                Pick a room to start chatting.
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

