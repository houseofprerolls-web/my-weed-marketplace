import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CreatePostBody = {
  caption?: string | null;
  media_urls?: string[];
  media_type?: 'image' | 'video' | 'carousel';
  product_id?: string | null;
  service_id?: string | null;
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

    const body = (await request.json()) as CreatePostBody;
    const caption = typeof body.caption === 'string' ? body.caption.trim() : null;
    const mediaUrls = Array.isArray(body.media_urls)
      ? body.media_urls.map((u) => String(u || '').trim()).filter(Boolean)
      : [];
    const mediaType =
      body.media_type === 'video' || body.media_type === 'carousel' || body.media_type === 'image'
        ? body.media_type
        : mediaUrls.length > 0
          ? 'image'
          : 'image';

    if (!caption && mediaUrls.length === 0) {
      return NextResponse.json({ error: 'Post must include text or media' }, { status: 400 });
    }

    // Basic sanity: prevent huge arrays
    if (mediaUrls.length > 8) {
      return NextResponse.json({ error: 'Too many media items' }, { status: 400 });
    }

    const productId = body.product_id ? String(body.product_id) : null;
    const serviceId = body.service_id ? String(body.service_id) : null;

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        caption,
        media_urls: mediaUrls,
        media_type: mediaType,
        product_id: productId,
        service_id: serviceId,
        expires_at: expiresAt,
      })
      .select('id, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, post: data });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

