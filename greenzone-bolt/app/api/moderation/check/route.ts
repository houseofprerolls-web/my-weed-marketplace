import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CheckBody = {
  context: 'community_chat' | 'ai_chat' | 'feed';
  text?: string | null;
  room_id?: string | null;
  attachments?: Array<{ mime_type?: string | null; bytes?: number | null }> | null;
};

const MUTE_HOURS = 24;
const MAX_TEXT_LEN = 2000;

function normalize(s: string) {
  return s.toLowerCase();
}

function scoreText(textRaw: string) {
  const text = normalize(textRaw);

  // Very lightweight heuristic rules (fast + deterministic).
  const sellingPatterns = [
    /\bfor sale\b/i,
    /\bdm (me|to)\b/i,
    /\bprice\b/i,
    /\bdeliver(y|ing)\b/i,
    /\bship(ping)?\b/i,
    /\bcashapp\b/i,
    /\bvenmo\b/i,
    /\bzelle\b/i,
    /\bbitcoin\b/i,
    /\bdiscount\b/i,
    /\bplug\b/i,
    /\bmeet( up)?\b/i,
    /\boz\b/i,
    /\bounce\b/i,
    /\bzip(s)?\b/i,
  ];

  const explicitPatterns = [
    /\bporn\b/i,
    /\bxxx\b/i,
    /\bnsfw\b/i,
    /\bnude\b/i,
    /\bsex\b/i,
    /\bfuck\b/i,
    /\bdick\b/i,
    /\bpussy\b/i,
  ];

  const spamSignals = {
    manyLinks: (text.match(/https?:\/\//g) || []).length >= 3,
    repeatedChars: /([a-z0-9])\1{8,}/i.test(text),
  };

  for (const re of explicitPatterns) {
    if (re.test(text)) return { allowed: false, rule: 'explicit', severity: 3 };
  }
  for (const re of sellingPatterns) {
    if (re.test(text)) return { allowed: false, rule: 'selling', severity: 3 };
  }
  if (spamSignals.manyLinks || spamSignals.repeatedChars) return { allowed: false, rule: 'spam', severity: 2 };

  return { allowed: true as const };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAuthed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as CheckBody;
    const context = body?.context;
    if (context !== 'community_chat' && context !== 'ai_chat' && context !== 'feed') {
      return NextResponse.json({ error: 'Invalid context' }, { status: 400 });
    }

    const text = typeof body.text === 'string' ? body.text.slice(0, MAX_TEXT_LEN) : '';

    // If user is already muted, block immediately.
    const { data: activeMute } = await supabaseAuthed
      .from('community_user_mutes')
      .select('muted_until, reason')
      .gt('muted_until', new Date().toISOString())
      .maybeSingle();
    if (activeMute?.muted_until) {
      return NextResponse.json({
        allowed: false,
        muted_until: activeMute.muted_until,
        reason: activeMute.reason || 'muted',
      });
    }

    // Basic per-minute rate limit for community chat (DB-backed).
    if (context === 'community_chat') {
      const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
      const { count } = await supabaseAuthed
        .from('community_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneMinuteAgo);
      if ((count || 0) >= 20) {
        // Treat as spam; mute.
        const until = new Date(Date.now() + MUTE_HOURS * 3600_000).toISOString();
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await supabaseAdmin.from('community_user_mutes').insert({
          user_id: user.id,
          muted_until: until,
          reason: 'spam_rate_limit',
        });
        await supabaseAdmin.from('community_moderation_events').insert({
          user_id: user.id,
          room_id: body.room_id || null,
          event_type: 'mute',
          rule: 'spam_rate_limit',
          severity: 3,
          details: { count_last_minute: count },
        });
        return NextResponse.json({ allowed: false, muted_until: until, reason: 'spam_rate_limit' });
      }
    }

    const verdict = scoreText(text);
    if (verdict.allowed) return NextResponse.json({ allowed: true });

    const mutedUntil = new Date(Date.now() + MUTE_HOURS * 3600_000).toISOString();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseAdmin.from('community_user_mutes').insert({
      user_id: user.id,
      muted_until: mutedUntil,
      reason: verdict.rule,
    });

    await supabaseAdmin.from('community_moderation_events').insert({
      user_id: user.id,
      room_id: body.room_id || null,
      event_type: 'mute',
      rule: verdict.rule,
      severity: verdict.severity,
      details: {
        context,
        text_sample: text.slice(0, 200),
        attachments: body.attachments || null,
      },
    });

    return NextResponse.json({
      allowed: false,
      muted_until: mutedUntil,
      reason: verdict.rule,
    });
  } catch (error) {
    console.error('Moderation check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

