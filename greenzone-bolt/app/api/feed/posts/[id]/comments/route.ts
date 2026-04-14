import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { viewerIsPlatformAdmin } from '@/lib/viewerPlatformAdmin';

type Params = { id: string };

async function resolveViewer(authHeader: string | null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );

  if (!authHeader) return { supabase, userId: null as string | null, isAdmin: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null as string | null, isAdmin: false };

  const isAdmin = await viewerIsPlatformAdmin(supabase, user.id);
  return { supabase, userId: user.id, isAdmin };
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const postId = typeof params?.id === 'string' ? params.id.trim() : '';
    if (!postId) return NextResponse.json({ error: 'Missing post id' }, { status: 400 });

    const authHeader = request.headers.get('authorization');
    const { supabase, userId, isAdmin } = await resolveViewer(authHeader);

    const { data, error } = await supabase
      .from('post_comments')
      .select(
        `
        id,
        post_id,
        user_id,
        comment,
        created_at,
        user_profiles!post_comments_user_id_fkey (
          id,
          username,
          avatar_url,
          is_verified,
          feed_shadowbanned
        )
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = ((data || []) as any[]).filter((r) => {
      const shadowbanned = r?.user_profiles?.feed_shadowbanned === true;
      if (!shadowbanned) return true;
      if (isAdmin) return true;
      return userId != null && String(r.user_id) === userId;
    });

    return NextResponse.json({ comments: rows });
  } catch (error) {
    console.error('Comment list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const postId = typeof params?.id === 'string' ? params.id.trim() : '';
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

    const body = (await request.json()) as { comment?: unknown };
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    if (!comment) return NextResponse.json({ error: 'Comment required' }, { status: 400 });
    if (comment.length > 500) return NextResponse.json({ error: 'Comment too long' }, { status: 400 });

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, comment })
      .select('id, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, comment: data });
  } catch (error) {
    console.error('Comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

