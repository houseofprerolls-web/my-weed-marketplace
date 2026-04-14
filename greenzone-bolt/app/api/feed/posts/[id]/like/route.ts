import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Params = { id: string };

function getPostId(params: unknown): string | null {
  const p = params as { id?: unknown };
  const id = typeof p?.id === 'string' ? p.id.trim() : '';
  return id ? id : null;
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const postId = getPostId(params);
    if (!postId) return NextResponse.json({ error: 'Missing post id' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    if (error) {
      // Unique violation means already liked
      if (error.code === '23505') return NextResponse.json({ ok: true, liked: true });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, liked: true });
  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const postId = getPostId(params);
    if (!postId) return NextResponse.json({ error: 'Missing post id' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, liked: false });
  } catch (error) {
    console.error('Unlike error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

