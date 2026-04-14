import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessAssistant } from '@/lib/ai/permissions';
import { buildAIContext } from '@/lib/ai/context-builder';
import { getSystemPrompt } from '@/lib/ai/service';
import { UserRole } from '@/lib/permissions';
import { AssistantType } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = (userRolesData?.map(r => r.role as UserRole) || ['customer']) as UserRole[];

    const body = await request.json();
    const { message, assistantType, includeContext, conversationId } = body;

    if (!message || !assistantType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!canAccessAssistant(userRoles, assistantType as AssistantType)) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot access this assistant type' },
        { status: 403 }
      );
    }

    const systemPrompt = await getSystemPrompt(assistantType as AssistantType);

    let context = '';
    if (includeContext) {
      context = await buildAIContext(
        user.id,
        assistantType as AssistantType,
        userRoles
      );
    }

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    if (context) {
      messages.push({
        role: 'system',
        content: `Here is relevant context about the user:\n\n${context}`,
      });
    }

    if (conversationId) {
      const { data: previousMessages } = await supabase
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10);

      if (previousMessages) {
        messages.push(...previousMessages);
      }
    }

    messages.push({ role: 'user', content: message });

    const aiResponse = await callOpenAI(messages);

    return NextResponse.json({
      message: aiResponse.content,
      messageId: crypto.randomUUID(),
      usage: {
        promptTokens: aiResponse.usage?.prompt_tokens || 0,
        completionTokens: aiResponse.usage?.completion_tokens || 0,
        totalTokens: aiResponse.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function callOpenAI(messages: Array<{ role: string; content: string }>) {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey || openaiApiKey === 'your-openai-api-key-here') {
    return {
      content: `[Demo Mode] This is a simulated AI response. In production, this would connect to OpenAI's API.

Your message has been received and would be processed by GPT-4. To enable real AI responses, add your OpenAI API key to the environment variables.

For now, I can help you understand how the system works:
- All conversations are securely stored
- Role-based permissions protect your data
- Context is automatically provided based on your role
- Usage is tracked for monitoring

What would you like to know?`,
      usage: {
        prompt_tokens: 150,
        completion_tokens: 100,
        total_tokens: 250,
      },
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}
