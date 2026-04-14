import { supabase } from '@/lib/supabase';
import {
  AIConversation,
  AIMessage,
  AssistantType,
  ChatMessage,
  AIServiceRequest,
  AIServiceResponse,
} from './types';
import { canAccessAssistant } from './permissions';
import { UserRole } from '@/lib/permissions';

export class AIService {
  private userId: string;
  private userRoles: UserRole[];

  constructor(userId: string, userRoles: UserRole[]) {
    this.userId = userId;
    this.userRoles = userRoles;
  }

  async sendMessage(request: AIServiceRequest): Promise<AIServiceResponse> {
    if (!canAccessAssistant(this.userRoles, request.assistantType)) {
      throw new Error('Unauthorized: Cannot access this assistant');
    }

    let conversationId = request.conversationId;

    if (!conversationId) {
      conversationId = await this.createConversation(request.assistantType);
    }

    await this.saveUserMessage(conversationId, request.message);

    const response = await this.callAIAPI(request);

    await this.saveAssistantMessage(
      conversationId,
      response.message,
      response.usage
    );

    if (response.usage) {
      await this.logUsage(
        conversationId,
        request.assistantType,
        response.usage
      );
    }

    return {
      ...response,
      conversationId,
    };
  }

  async getConversations(assistantType?: AssistantType): Promise<AIConversation[]> {
    let query = supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });

    if (assistantType) {
      query = query.eq('assistant_type', assistantType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getConversation(conversationId: string): Promise<AIConversation | null> {
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (convError) throw convError;
    if (!conversation) return null;

    const { data: messages, error: msgError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    return {
      ...conversation,
      messages: messages || [],
    };
  }

  async archiveConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', this.userId);

    if (error) throw error;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', this.userId);

    if (error) throw error;
  }

  async submitFeedback(
    messageId: string,
    rating: number,
    feedbackText?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_feedback')
      .insert({
        message_id: messageId,
        user_id: this.userId,
        rating,
        feedback_text: feedbackText,
      });

    if (error) throw error;
  }

  private async createConversation(assistantType: AssistantType): Promise<string> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: this.userId,
        assistant_type: assistantType,
        title: 'New conversation',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async saveUserMessage(
    conversationId: string,
    content: string
  ): Promise<void> {
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    });

    await this.updateConversationTimestamp(conversationId);
  }

  private async saveAssistantMessage(
    conversationId: string,
    content: string,
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content,
        metadata: usage || {},
      })
      .select()
      .single();

    if (error) throw error;

    await this.updateConversationTimestamp(conversationId);

    return data.id;
  }

  private async updateConversationTimestamp(conversationId: string): Promise<void> {
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  private async logUsage(
    conversationId: string,
    assistantType: AssistantType,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  ): Promise<void> {
    const costEstimate = this.calculateCost(usage.totalTokens, 'gpt-4o');

    await supabase.from('ai_usage_logs').insert({
      user_id: this.userId,
      assistant_type: assistantType,
      conversation_id: conversationId,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      model: 'gpt-4o',
      cost_estimate: costEstimate,
    });
  }

  private calculateCost(tokens: number, model: string): number {
    const pricing: Record<string, number> = {
      'gpt-4o': 0.000005,
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000001,
    };

    return tokens * (pricing[model] || 0.000001);
  }

  private async callAIAPI(request: AIServiceRequest): Promise<AIServiceResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling AI API:', error);
      throw new Error('Failed to get AI response. Please try again.');
    }
  }
}

export async function getSystemPrompt(assistantType: AssistantType): Promise<string> {
  const { data } = await supabase
    .from('ai_assistant_prompts')
    .select('prompt_template')
    .eq('assistant_type', assistantType)
    .eq('prompt_key', 'system')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.prompt_template || '';
}

export async function getGreetingPrompt(assistantType: AssistantType): Promise<string> {
  const { data } = await supabase
    .from('ai_assistant_prompts')
    .select('prompt_template')
    .eq('assistant_type', assistantType)
    .eq('prompt_key', 'greeting')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.prompt_template || 'Hello! How can I help you today?';
}
