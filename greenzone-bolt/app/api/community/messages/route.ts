import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CreateMessageBody = {
  room_id: string;
  content?: string | null;
  attachment?: {
    bucket: string;
    object_path: string;
    public_url: string;
    mime_type?: string | null;
    bytes?: number | null;
  } | null;
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as CreateMessageBody;
    const roomId = typeof body.room_id === 'string' ? body.room_id.trim() : '';
    if (!roomId) return NextResponse.json({ error: 'Missing room_id' }, { status: 400 });

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const attachment = body.attachment || null;
    if (!content && !attachment) return NextResponse.json({ error: 'Message must include text or attachment' }, { status: 400 });

    // Moderation gate
    const modRes = await fetch(new URL('/api/moderation/check', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: authHeader,
      },
      body: JSON.stringify({
        context: 'community_chat',
        text: content || '',
        room_id: roomId,
        attachments: attachment ? [{ mime_type: attachment.mime_type || null, bytes: attachment.bytes || null }] : [],
      }),
    });
    const mod = await modRes.json();
    if (!modRes.ok) return NextResponse.json({ error: mod.error || modRes.statusText }, { status: 400 });
    if (!mod.allowed) {
      return NextResponse.json(
        { error: 'Muted', muted_until: mod.muted_until, reason: mod.reason },
        { status: 403 }
      );
    }

    const { data: msg, error: msgErr } = await supabase
      .from('community_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content: content || null,
      })
      .select('id, created_at')
      .single();
    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

    if (attachment) {
      const { error: attErr } = await supabase.from('community_message_attachments').insert({
        message_id: msg.id,
        bucket: attachment.bucket,
        object_path: attachment.object_path,
        public_url: attachment.public_url,
        mime_type: attachment.mime_type || null,
        bytes: attachment.bytes ?? null,
      });
      if (attErr) return NextResponse.json({ error: attErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: msg });
  } catch (error) {
    console.error('Community message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

